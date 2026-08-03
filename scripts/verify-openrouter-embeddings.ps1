$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env.local"
$line = Get-Content -LiteralPath $envFile |
  Where-Object { $_ -match '^OPENROUTER_API_KEY=' } |
  Select-Object -First 1

if (-not $line) {
  throw "OPENROUTER_API_KEY no existe en .env.local"
}

$apiKey = $line.Substring("OPENROUTER_API_KEY=".Length).Trim()
if ([string]::IsNullOrWhiteSpace($apiKey)) {
  throw "OPENROUTER_API_KEY está vacía"
}

$headers = @{
  Authorization = "Bearer $apiKey"
  "Content-Type" = "application/json"
}
$model = "nvidia/nemotron-3-embed-1b:free"

function Invoke-EmbeddingRequest($payload) {
  $timer = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $response = Invoke-RestMethod `
      -Method Post `
      -Uri "https://openrouter.ai/api/v1/embeddings" `
      -Headers $headers `
      -Body ($payload | ConvertTo-Json -Depth 8 -Compress) `
      -TimeoutSec 45
    $timer.Stop()
    return @{ ok = $true; response = $response; ms = $timer.ElapsedMilliseconds }
  }
  catch {
    $timer.Stop()
    $status = if ($_.Exception.Response) {
      [int]$_.Exception.Response.StatusCode
    }
    else {
      $null
    }
    return @{
      ok = $false
      status = $status
      error = $_.Exception.Message
      ms = $timer.ElapsedMilliseconds
    }
  }
}

function Get-VectorNorm($values) {
  $sum = 0.0
  foreach ($value in $values) {
    $sum += [double]$value * [double]$value
  }
  return [Math]::Sqrt($sum)
}

function Get-CosineSimilarity($left, $right) {
  $dot = 0.0
  $leftNorm = 0.0
  $rightNorm = 0.0
  for ($index = 0; $index -lt $left.Count; $index++) {
    $x = [double]$left[$index]
    $y = [double]$right[$index]
    $dot += $x * $y
    $leftNorm += $x * $x
    $rightNorm += $y * $y
  }
  return $dot / ([Math]::Sqrt($leftNorm) * [Math]::Sqrt($rightNorm))
}

$summary = [ordered]@{}

try {
  $keyInfo = Invoke-RestMethod `
    -Method Get `
    -Uri "https://openrouter.ai/api/v1/key" `
    -Headers @{ Authorization = "Bearer $apiKey" } `
    -TimeoutSec 20
  $summary.key = [ordered]@{
    ok = $true
    is_free_tier = $keyInfo.data.is_free_tier
    limit = $keyInfo.data.limit
    limit_remaining = $keyInfo.data.limit_remaining
    reset = $keyInfo.data.limit_reset
  }
}
catch {
  $summary.key = [ordered]@{
    ok = $false
    status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { $null }
    error = $_.Exception.Message
  }
}

$default = Invoke-EmbeddingRequest @{
  model = $model
  input = "Arquitecturas de recuperación aumentada"
  encoding_format = "float"
}

if ($default.ok) {
  $vector = $default.response.data[0].embedding
  $summary.default = [ordered]@{
    ok = $true
    model = $default.response.model
    dimensions = $vector.Count
    norm = [Math]::Round((Get-VectorNorm $vector), 6)
    ms = $default.ms
  }
}
else {
  $summary.default = $default
}

$reduced = Invoke-EmbeddingRequest @{
  model = $model
  input = "Arquitecturas de recuperación aumentada"
  dimensions = 1024
  encoding_format = "float"
}

if ($reduced.ok) {
  $vector = $reduced.response.data[0].embedding
  $summary.dimensions_1024 = [ordered]@{
    ok = $true
    model = $reduced.response.model
    dimensions = $vector.Count
    norm = [Math]::Round((Get-VectorNorm $vector), 6)
    ms = $reduced.ms
  }
}
else {
  $summary.dimensions_1024 = $reduced
}

$query = Invoke-EmbeddingRequest @{
  model = $model
  input = "¿Qué combina una arquitectura RAG?"
  input_type = "search_query"
  encoding_format = "float"
}

$documents = Invoke-EmbeddingRequest @{
  model = $model
  input = @(
    "RAG combina recuperación de información con generación de respuestas.",
    "Los índices HNSW aceleran búsquedas aproximadas entre vectores.",
    "Las plantas necesitan luz y agua para crecer."
  )
  input_type = "search_document"
  encoding_format = "float"
}

if ($query.ok -and $documents.ok) {
  $queryVector = $query.response.data[0].embedding
  $scores = @()
  for ($index = 0; $index -lt $documents.response.data.Count; $index++) {
    $documentVector = $documents.response.data[$index].embedding
    $scores += [ordered]@{
      document = $index + 1
      score = [Math]::Round((Get-CosineSimilarity $queryVector $documentVector), 6)
      dimensions = $documentVector.Count
    }
  }
  $summary.input_type_and_semantics = [ordered]@{
    ok = $true
    query_dimensions = $queryVector.Count
    documents = $documents.response.data.Count
    query_ms = $query.ms
    documents_ms = $documents.ms
    ranking = @($scores | Sort-Object { [double]$_['score'] } -Descending)
  }
}
else {
  $summary.input_type_and_semantics = [ordered]@{
    ok = $false
    query_status = $query.status
    documents_status = $documents.status
    query_error = $query.error
    documents_error = $documents.error
  }
}

# If the model rejects input_type, isolate batch support without that parameter.
if (-not ($query.ok -and $documents.ok)) {
  $plainBatch = Invoke-EmbeddingRequest @{
    model = $model
    input = @(
      "RAG combina recuperación de información con generación de respuestas.",
      "Los índices HNSW aceleran búsquedas aproximadas entre vectores.",
      "Las plantas necesitan luz y agua para crecer."
    )
    encoding_format = "float"
  }

  if ($plainBatch.ok) {
    $summary.batch_without_input_type = [ordered]@{
      ok = $true
      documents = $plainBatch.response.data.Count
      dimensions = $plainBatch.response.data[0].embedding.Count
      ordered_indexes = @($plainBatch.response.data | ForEach-Object { $_.index })
      ms = $plainBatch.ms
    }
  }
  else {
    $summary.batch_without_input_type = $plainBatch
  }
}

# NVIDIA specifies explicit text prefixes for retrieval. OpenRouter's endpoint
# rejects input_type, so verify the effective contract using prefixed strings.
$prefixedQuery = Invoke-EmbeddingRequest @{
  model = $model
  input = "query: ¿Qué combina una arquitectura RAG?"
  encoding_format = "float"
}

$prefixedDocuments = Invoke-EmbeddingRequest @{
  model = $model
  input = @(
    "passage: RAG combina recuperación de información con generación de respuestas.",
    "passage: Los índices HNSW aceleran búsquedas aproximadas entre vectores.",
    "passage: Las plantas necesitan luz y agua para crecer."
  )
  encoding_format = "float"
}

if ($prefixedQuery.ok -and $prefixedDocuments.ok) {
  $queryVector = $prefixedQuery.response.data[0].embedding
  $scores = @()
  for ($index = 0; $index -lt $prefixedDocuments.response.data.Count; $index++) {
    $documentVector = $prefixedDocuments.response.data[$index].embedding
    $scores += [ordered]@{
      document = $index + 1
      score = [Math]::Round((Get-CosineSimilarity $queryVector $documentVector), 6)
    }
  }
  # Ordered dictionaries need explicit key access; property sorting can silently
  # preserve/reverse insertion order and report the wrong top document.
  $ranking = @($scores | Sort-Object { [double]$_['score'] } -Descending)
  $summary.prefixed_semantic_ranking = [ordered]@{
    ok = $true
    prefixes = "query: / passage:"
    query_dimensions = $queryVector.Count
    documents = $prefixedDocuments.response.data.Count
    ordered_indexes = @($prefixedDocuments.response.data | ForEach-Object { $_.index })
    expected_top_document = 1
    actual_top_document = $ranking[0].document
    relevant_document_ranked_first = ($ranking[0].document -eq 1)
    query_ms = $prefixedQuery.ms
    documents_ms = $prefixedDocuments.ms
    ranking = $ranking
  }
}
else {
  $summary.prefixed_semantic_ranking = [ordered]@{
    ok = $false
    query_status = $prefixedQuery.status
    documents_status = $prefixedDocuments.status
    query_error = $prefixedQuery.error
    documents_error = $prefixedDocuments.error
  }
}

$summary | ConvertTo-Json -Depth 8
