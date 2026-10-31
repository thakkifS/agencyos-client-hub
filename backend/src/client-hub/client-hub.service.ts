import { Injectable } from "@nestjs/common";

@Injectable()
export class ClientHubService {
  capabilities() {
    return {
      implemented: ["health-check"],
      planned: ["client-list", "client-workspace", "requirements", "communications", "activity-timeline", "confirmed-requirement-export"],
    };
  }
}
