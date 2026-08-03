import { describe, expect, it, vi } from "vitest";
import { prepareIngestion, type IngestionJob, type IngestionRepository } from "./service";

const job: IngestionJob = { id: "job", sourceId: "source", ownerId: "owner", notebookId: "notebook" };
function repository(overrides: Partial<IngestionRepository> = {}): IngestionRepository {
  return {
    claimQueuedJob: vi.fn().mockResolvedValue(true),
    getOwnedSource: vi.fn().mockResolvedValue({ id: "source", extractedText: "Contenido verificable." }),
    markSourceProcessing: vi.fn().mockResolvedValue(undefined),
    markReadyForEmbedding: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    finalize: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("prepareIngestion", () => {
  it("prepares an owned queued source for embedding", async () => {
    const repo = repository();
    const result = await prepareIngestion(repo, job);
    expect(result.status).toBe("prepared");
    expect(repo.markReadyForEmbedding).toHaveBeenCalledWith("job", "owner");
  });
  it("does no work when another request already claimed the job", async () => {
    const repo = repository({ claimQueuedJob: vi.fn().mockResolvedValue(false) });
    await expect(prepareIngestion(repo, job)).resolves.toEqual({ status: "already_claimed" });
    expect(repo.getOwnedSource).not.toHaveBeenCalled();
  });
  it("marks empty content as a permanent failure", async () => {
    const repo = repository({ getOwnedSource: vi.fn().mockResolvedValue({ id: "source", extractedText: "" }) });
    await expect(prepareIngestion(repo, job)).resolves.toEqual({ status: "failed", code: "empty_content" });
    expect(repo.markFailed).toHaveBeenCalledWith(job, "empty_content", false);
  });
});
