export function describeClientActivity(action: string, metadata: unknown): string {
  const data = metadata && typeof metadata === "object" ? metadata as Record<string, unknown> : {};
  const descriptions: Record<string, string> = {
    CLIENT_CREATED: "Client record created",
    CLIENT_UPDATED: "Client details updated",
    REQUIREMENT_CREATED: "Requirement created",
    REQUIREMENT_UPDATED: "Requirement details updated",
    REQUIREMENT_DRAFT: "Requirement returned to draft",
    REQUIREMENT_UNDER_REVIEW: "Requirement submitted for review",
    REQUIREMENT_CHANGES_REQUESTED: "Changes requested for requirement",
    REQUIREMENT_CONFIRMED: "Requirement confirmed",
    REQUIREMENT_REVISION_CREATED: "Confirmed requirement revision created",
    REQUIREMENT_ARCHIVED: "Requirement archived",
    COMMUNICATION_RECORDED: `Communication logged (${String(data.communicationType ?? "OTHER").replaceAll("_", " ")})`,
    FILE_ADDED: "File uploaded",
    REFERENCE_ADDED: "Reference link added",
    FILE_REMOVED: "File removed",
    REFERENCE_REMOVED: "Reference link removed",
  };
  return descriptions[action] ?? "Client activity recorded";
}
