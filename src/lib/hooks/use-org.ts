"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { Org, Membership, OrgRole } from "@/lib/supabase/types";

interface OrgState {
  currentOrg: Org | null;
  membership: Membership | null;
  memberships: Membership[];
  orgs: Org[];
  role: OrgRole | null;
  loading: boolean;
  setCurrentOrg: (org: Org, membership: Membership) => void;
  setAll: (data: {
    orgs: Org[];
    memberships: Membership[];
    currentOrg: Org | null;
    membership: Membership | null;
    role: OrgRole | null;
  }) => void;
  setLoading: (loading: boolean) => void;
}

export const useOrgStore = create<OrgState>((set) => ({
  currentOrg: null,
  membership: null,
  memberships: [],
  orgs: [],
  role: null,
  loading: true,
  setCurrentOrg: (org, membership) =>
    set({ currentOrg: org, membership, role: membership.role }),
  setAll: (data) => set({ ...data, loading: false }),
  setLoading: (loading) => set({ loading }),
}));

export function useOrg() {
  const store = useOrgStore();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        store.setLoading(false);
        return;
      }

      // Fetch memberships for the current user
      const { data: memberships, error: membershipsError } = await supabase
        .from("memberships")
        .select("*")
        .eq("user_id", user.id);

      if (membershipsError || !memberships || memberships.length === 0) {
        store.setAll({
          orgs: [],
          memberships: [],
          currentOrg: null,
          membership: null,
          role: null,
        });
        return;
      }

      // Fetch all orgs the user belongs to
      const orgIds = memberships.map((m) => m.org_id);
      const { data: orgs, error: orgsError } = await supabase
        .from("orgs")
        .select("*")
        .in("id", orgIds);

      if (orgsError || !orgs || orgs.length === 0) {
        store.setAll({
          orgs: [],
          memberships,
          currentOrg: null,
          membership: null,
          role: null,
        });
        return;
      }

      if (cancelled) return;

      // Default to first org if none selected
      const currentOrg = store.currentOrg
        ? orgs.find((o) => o.id === store.currentOrg!.id) ?? orgs[0]
        : orgs[0];

      const currentMembership =
        memberships.find((m) => m.org_id === currentOrg.id) ?? memberships[0];

      store.setAll({
        orgs,
        memberships,
        currentOrg,
        membership: currentMembership,
        role: currentMembership.role,
      });
    }

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return store;
}
