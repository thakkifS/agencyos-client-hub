import { apiRequest } from "@/lib/api/client";
import type { ClientHubOverview, PageResult, ClientRecord } from "@/lib/types/client-hub";

export function getClientHubOverview() {
  return apiRequest<ClientHubOverview>("/client-hub/overview");
}

export function getClientsForRequirementPicker() {
  return apiRequest<PageResult<ClientRecord>>("/clients?page=1&limit=100");
}
