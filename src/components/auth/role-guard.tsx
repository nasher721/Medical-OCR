"use client";

import { useOrgStore } from "@/lib/hooks/use-org";
import { OrgRole } from "@/lib/supabase/types";
import { ReactNode } from "react";

const ROLE_HIERARCHY: Record<OrgRole, number> = {
    viewer: 0,
    member: 1,
    reviewer: 2,
    admin: 3,
};

interface RoleGuardProps {
    children: ReactNode;
    minRole?: OrgRole;
    allowedRoles?: OrgRole[];
    fallback?: ReactNode;
}

export function RoleGuard({
    children,
    minRole,
    allowedRoles,
    fallback = null,
}: RoleGuardProps) {
    const { role, loading } = useOrgStore();

    if (loading) return null; // Or a loading spinner if preferred

    if (!role) return <>{fallback}</>;

    if (minRole) {
        if (ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]) {
            return <>{children}</>;
        }
    }

    if (allowedRoles) {
        if (allowedRoles.includes(role)) {
            return <>{children}</>;
        }
    }

    return <>{fallback}</>;
}

export function hasRole(userRole: OrgRole | null, minRole: OrgRole): boolean {
    if (!userRole) return false;
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}
