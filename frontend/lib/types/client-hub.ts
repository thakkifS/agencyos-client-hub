export type PageResult<T> = {
  items: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

export type ClientRecord = {
  id: string;
  name: string;
  primaryContactName: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  website: string | null;
  status: string;
  updatedAt: string;
  _count?: { requirements: number; projects: number };
};

export type RequirementItem = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  requirementType: "FUNCTIONAL" | "NON_FUNCTIONAL";
  itemStatus: "PENDING" | "CLARIFICATION" | "ACCEPTED";
  priority: string;
  notes: string | null;
  sortOrder: number;
};

export type RequirementRecord = {
  id: string;
  clientId: string;
  title: string | null;
  businessObjective: string | null;
  requestedServices: string[];
  designPreferences: string | null;
  referenceLinks: string[];
  budgetMin: string | null;
  budgetMax: string | null;
  currency: string | null;
  expectedTimeline: string | null;
  targetDate: string | null;
  constraints: string | null;
  assumptions: string | null;
  additionalNotes: string | null;
  status: string;
  updatedAt: string;
  confirmedAt: string | null;
  preparedBy: { id: string; name: string };
  confirmedBy: { id: string; name: string } | null;
  items: RequirementItem[];
  revisions: Array<{
    id: string;
    version: number;
    changeReason: string | null;
    confirmedAt: string;
    confirmedBy: { id: string; name: string };
  }>;
};

export type CommunicationRecord = {
  id: string;
  type: "CALL" | "EMAIL" | "MEETING" | "WHATSAPP_MESSAGE" | "VIDEO_MEETING" | "OTHER";
  subject: string;
  summary: string;
  participants: string[];
  occurredAt: string;
  followUpNotes: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
  requirement: { id: string; title: string } | null;
};

export type ClientAssetRecord = {
  id: string;
  clientId: string;
  requirementId: string | null;
  type: "FILE" | "REFERENCE";
  originalName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  externalUrl: string | null;
  label: string;
  uploadedAt: string;
  uploadedBy: { id: string; name: string };
  requirement: { id: string; title: string } | null;
  downloadUrl: string | null;
};

export type ActivityRecord = {
  id: string;
  eventType: string;
  clientId: string;
  requirementId: string | null;
  actor: { id: string; name: string } | null;
  occurredAt: string;
  description: string;
  relatedRequirementTitle: string | null;
};

export type ClientHubOverview = {
  metrics: {
    totalClients: number;
    draftRequirements: number;
    underReviewRequirements: number;
    confirmedRequirements: number;
  };
  recentClients: Array<Pick<ClientRecord, "id" | "name" | "status" | "updatedAt"> & { _count: { requirements: number } }>;
  requirementsNeedingAttention: Array<{
    id: string;
    clientId: string;
    title: string | null;
    status: "UNDER_REVIEW" | "CHANGES_REQUESTED";
    updatedAt: string;
    client: { id: string; name: string };
    preparedBy: { id: string; name: string };
  }>;
  recentCommunications: Array<{
    id: string;
    clientId: string;
    requirementId: string | null;
    type: CommunicationRecord["type"];
    subject: string;
    occurredAt: string;
    client: { id: string; name: string };
    requirement: { id: string; title: string | null } | null;
  }>;
  recentFiles: Array<{
    id: string;
    clientId: string;
    requirementId: string | null;
    type: "FILE" | "REFERENCE";
    label: string;
    originalName: string | null;
    externalUrl: string | null;
    uploadedAt: string;
    client: { id: string; name: string };
  }>;
  recentActivity: Array<{
    id: string;
    eventType: string;
    clientId: string;
    clientName: string;
    requirementId: string | null;
    requirementTitle: string | null;
    actor: { id: string; name: string } | null;
    occurredAt: string;
    description: string;
  }>;
};
