import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";
import type { ModuleAccessMap } from "@/lib/permissions/modules";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      avatar?: string | null;
      moduleAccess?: ModuleAccessMap | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    avatar?: string | null;
    moduleAccess?: ModuleAccessMap | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    avatar?: string | null;
    moduleAccess?: ModuleAccessMap | null;
  }
}
