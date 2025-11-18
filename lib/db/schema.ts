import {
  pgTable,
  foreignKey,
  unique,
  pgPolicy,
  uuid,
  text,
  timestamp,
  index,
  type AnyPgColumn,
  boolean,
  jsonb,
  integer,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const changeKind = pgEnum("change_kind", ["permission", "simulation", "branch"])
export const membershipStatus = pgEnum("membership_status", ["invited", "accepted", "suspended"])
export const notebookPermission = pgEnum("notebook_permission", ["owner", "editor", "commenter", "viewer"])
export const orgRole = pgEnum("org_role", ["admin", "modeler", "viewer"])
export const simulationStatus = pgEnum("simulation_status", ["queued", "running", "succeeded", "failed"])

export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id").primaryKey().notNull(),
    fullName: text("full_name"),
    handle: text(),
    avatarUrl: text("avatar_url"),
    organizationId: uuid("organization_id"),
    title: text(),
    timezone: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "profiles_organization_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "profiles_user_id_fkey",
    }).onDelete("cascade"),
    unique("profiles_handle_key").on(table.handle),
    pgPolicy("org_member_profiles", {
      as: "permissive",
      for: "select",
      to: ["public"],
      using: sql`(EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.user_id = profiles.user_id) AND (om.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid()))))))`,
    }),
    pgPolicy("profiles_self", { as: "permissive", for: "select", to: ["public"] }),
  ]
)

export const organizations = pgTable(
  "organizations",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    domain: text(),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: "organizations_created_by_fkey",
    }).onDelete("set null"),
    unique("organizations_domain_key").on(table.domain),
    pgPolicy("org_units_manage", {
      as: "permissive",
      for: "select",
      to: ["public"],
      using: sql`(EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = organizations.id) AND (om.user_id = auth.uid()))))`,
    }),
  ]
)

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: orgRole().default("viewer").notNull(),
    status: membershipStatus().default("invited").notNull(),
    invitedBy: uuid("invited_by"),
    // TODO: failed to parse database type 'citext'
    invitedEmail: unknown("invited_email"),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("organization_members_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.invitedBy],
      foreignColumns: [profiles.userId],
      name: "organization_members_invited_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "organization_members_organization_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [profiles.userId],
      name: "organization_members_user_id_fkey",
    }).onDelete("cascade"),
    unique("organization_members_organization_id_user_id_key").on(table.organizationId, table.userId),
    pgPolicy("delete_org_members_for_admins", {
      as: "permissive",
      for: "delete",
      to: ["public"],
      using: sql`is_org_admin(organization_id)`,
    }),
    pgPolicy("insert_org_members_for_admins", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("select_org_members_for_members", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("update_org_members_for_admins", { as: "permissive", for: "update", to: ["public"] }),
  ]
)

export const notebooks = pgTable(
  "notebooks",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    description: text(),
    organizationId: uuid("organization_id"),
    ownerId: uuid("owner_id").notNull(),
    sharingToken: uuid("sharing_token").defaultRandom(),
    isDirty: boolean("is_dirty").default(false).notNull(),
    dirtyFields: jsonb("dirty_fields").default({}).notNull(),
    lastSimulationId: uuid("last_simulation_id"),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("notebooks_owner_id_updated_at_idx").using(
      "btree",
      table.ownerId.asc().nullsLast().op("timestamptz_ops"),
      table.updatedAt.desc().nullsFirst().op("timestamptz_ops")
    ),
    foreignKey({
      columns: [table.lastSimulationId],
      foreignColumns: [simulations.id],
      name: "notebooks_last_simulation_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "notebooks_organization_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [profiles.userId],
      name: "notebooks_owner_id_fkey",
    }).onDelete("cascade"),
    unique("notebooks_sharing_token_key").on(table.sharingToken),
    pgPolicy("delete_notebooks_for_managers", {
      as: "permissive",
      for: "delete",
      to: ["public"],
      using: sql`can_manage_notebook_collaborators(id)`,
    }),
    pgPolicy("insert_notebooks_for_owner", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("select_notebooks_for_members", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("update_notebooks_for_editors", { as: "permissive", for: "update", to: ["public"] }),
  ]
)

export const notebookCategories = pgTable(
  "notebook_categories",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    notebookId: uuid("notebook_id").notNull(),
    name: text().notNull(),
    description: text(),
    orderIndex: integer("order_index").default(0).notNull(),
    timePeriod: text("time_period"),
    totalFormulaId: uuid("total_formula_id"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("notebook_categories_notebook_id_order_index_idx").using(
      "btree",
      table.notebookId.asc().nullsLast().op("int4_ops"),
      table.orderIndex.asc().nullsLast().op("int4_ops")
    ),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.userId],
      name: "notebook_categories_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.notebookId],
      foreignColumns: [notebooks.id],
      name: "notebook_categories_notebook_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("delete_notebook_categories_for_editors", {
      as: "permissive",
      for: "delete",
      to: ["public"],
      using: sql`is_notebook_editor(notebook_id)`,
    }),
    pgPolicy("insert_notebook_categories_for_editors", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("select_notebook_categories_for_members", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("update_notebook_categories_for_editors", { as: "permissive", for: "update", to: ["public"] }),
  ]
)

export const notebookMetrics = pgTable(
  "notebook_metrics",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    notebookId: uuid("notebook_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    name: text().notNull(),
    unit: text(),
    distribution: jsonb(),
    value: numeric(),
    description: text(),
    tags: text().array().default([""]).notNull(),
    isLocked: boolean("is_locked").default(false).notNull(),
    orderIndex: integer("order_index").default(0).notNull(),
    version: integer().default(1).notNull(),
    createUserId: uuid("create_user_id"),
    lastUpdatedUserId: uuid("last_updated_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("notebook_metrics_notebook_id_category_id_order_index_idx").using(
      "btree",
      table.notebookId.asc().nullsLast().op("uuid_ops"),
      table.categoryId.asc().nullsLast().op("int4_ops"),
      table.orderIndex.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [notebookCategories.id],
      name: "notebook_metrics_category_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.createUserId],
      foreignColumns: [profiles.userId],
      name: "notebook_metrics_create_user_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.lastUpdatedUserId],
      foreignColumns: [profiles.userId],
      name: "notebook_metrics_last_updated_user_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.notebookId],
      foreignColumns: [notebooks.id],
      name: "notebook_metrics_notebook_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("delete_notebook_metrics_for_editors", {
      as: "permissive",
      for: "delete",
      to: ["public"],
      using: sql`is_notebook_editor(notebook_id)`,
    }),
    pgPolicy("insert_notebook_metrics_for_editors", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("select_notebook_metrics_for_members", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("update_notebook_metrics_for_editors", { as: "permissive", for: "update", to: ["public"] }),
  ]
)

export const notebookFormulas = pgTable(
  "notebook_formulas",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    notebookId: uuid("notebook_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    name: text().notNull(),
    expression: text().notNull(),
    ast: jsonb(),
    dependentMetrics: uuid("dependent_metrics").array().default([""]).notNull(),
    dependentFormulas: uuid("dependent_formulas").array().default([""]).notNull(),
    version: integer().default(1).notNull(),
    createUserId: uuid("create_user_id"),
    lastUpdatedUserId: uuid("last_updated_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("notebook_formulas_notebook_id_category_id_idx").using(
      "btree",
      table.notebookId.asc().nullsLast().op("uuid_ops"),
      table.categoryId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [notebookCategories.id],
      name: "notebook_formulas_category_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.createUserId],
      foreignColumns: [profiles.userId],
      name: "notebook_formulas_create_user_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.lastUpdatedUserId],
      foreignColumns: [profiles.userId],
      name: "notebook_formulas_last_updated_user_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.notebookId],
      foreignColumns: [notebooks.id],
      name: "notebook_formulas_notebook_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("delete_notebook_formulas_for_editors", {
      as: "permissive",
      for: "delete",
      to: ["public"],
      using: sql`is_notebook_editor(notebook_id)`,
    }),
    pgPolicy("insert_notebook_formulas_for_editors", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("select_notebook_formulas_for_members", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("update_notebook_formulas_for_editors", { as: "permissive", for: "update", to: ["public"] }),
  ]
)

export const notebookCollaborators = pgTable(
  "notebook_collaborators",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    notebookId: uuid("notebook_id").notNull(),
    userId: uuid("user_id").notNull(),
    permission: notebookPermission().default("viewer").notNull(),
    canRunSimulations: boolean("can_run_simulations").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("notebook_collaborators_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.notebookId],
      foreignColumns: [notebooks.id],
      name: "notebook_collaborators_notebook_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [profiles.userId],
      name: "notebook_collaborators_user_id_fkey",
    }).onDelete("cascade"),
    unique("notebook_collaborators_notebook_id_user_id_key").on(table.notebookId, table.userId),
    pgPolicy("delete_notebook_collaborators_for_managers", {
      as: "permissive",
      for: "delete",
      to: ["public"],
      using: sql`can_manage_notebook_collaborators(notebook_id)`,
    }),
    pgPolicy("insert_notebook_collaborators_for_managers", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("select_notebook_collaborators_for_members", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("update_notebook_collaborators_for_managers", { as: "permissive", for: "update", to: ["public"] }),
  ]
)

export const notebookInvites = pgTable(
  "notebook_invites",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    notebookId: uuid("notebook_id").notNull(),
    // TODO: failed to parse database type 'citext'
    email: unknown("email").notNull(),
    permission: notebookPermission().default("viewer").notNull(),
    message: text(),
    invitedBy: uuid("invited_by"),
    token: uuid().defaultRandom().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" })
      .default(sql`(now() + '14 days'::interval)`)
      .notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("notebook_invites_email_idx").using("btree", table.email.asc().nullsLast().op("citext_ops")),
    foreignKey({
      columns: [table.invitedBy],
      foreignColumns: [profiles.userId],
      name: "notebook_invites_invited_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.notebookId],
      foreignColumns: [notebooks.id],
      name: "notebook_invites_notebook_id_fkey",
    }).onDelete("cascade"),
    unique("notebook_invites_notebook_id_email_key").on(table.notebookId, table.email),
    pgPolicy("delete_notebook_invites_for_managers", {
      as: "permissive",
      for: "delete",
      to: ["public"],
      using: sql`can_manage_notebook_collaborators(notebook_id)`,
    }),
    pgPolicy("insert_notebook_invites_for_managers", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("select_notebook_invites_for_managers", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("update_notebook_invites_for_managers", { as: "permissive", for: "update", to: ["public"] }),
  ]
)

export const notebookBranches = pgTable(
  "notebook_branches",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    notebookId: uuid("notebook_id").notNull(),
    parentBranchId: uuid("parent_branch_id"),
    createdBy: uuid("created_by"),
    name: text().notNull(),
    notes: text(),
    isCustomerBranch: boolean("is_customer_branch").default(false).notNull(),
    shareBack: boolean("share_back").default(false).notNull(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    mergedAt: timestamp("merged_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("notebook_branches_notebook_id_idx").using("btree", table.notebookId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.userId],
      name: "notebook_branches_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.notebookId],
      foreignColumns: [notebooks.id],
      name: "notebook_branches_notebook_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.parentBranchId],
      foreignColumns: [table.id],
      name: "notebook_branches_parent_branch_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("delete_notebook_branches_for_managers", {
      as: "permissive",
      for: "delete",
      to: ["public"],
      using: sql`can_manage_notebook_collaborators(notebook_id)`,
    }),
    pgPolicy("insert_notebook_branches_for_editors", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("select_notebook_branches_for_members", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("update_notebook_branches_for_editors", { as: "permissive", for: "update", to: ["public"] }),
  ]
)

export const branchSnapshots = pgTable(
  "branch_snapshots",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    branchId: uuid("branch_id").notNull(),
    baseSimulationId: uuid("base_simulation_id"),
    diff: jsonb().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.baseSimulationId],
      foreignColumns: [simulations.id],
      name: "branch_snapshots_base_simulation_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.branchId],
      foreignColumns: [notebookBranches.id],
      name: "branch_snapshots_branch_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("delete_branch_snapshots_for_managers", {
      as: "permissive",
      for: "delete",
      to: ["public"],
      using: sql`can_manage_branch(branch_id)`,
    }),
    pgPolicy("insert_branch_snapshots_for_editors", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("select_branch_snapshots_for_members", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("update_branch_snapshots_for_editors", { as: "permissive", for: "update", to: ["public"] }),
  ]
)

export const changesLog = pgTable(
  "changes_log",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    notebookId: uuid("notebook_id").notNull(),
    branchId: uuid("branch_id"),
    actorId: uuid("actor_id"),
    changeType: changeKind("change_type").notNull(),
    entityId: uuid("entity_id"),
    summary: text(),
    prevState: jsonb("prev_state"),
    nextState: jsonb("next_state"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("changes_log_notebook_id_created_at_idx").using(
      "btree",
      table.notebookId.asc().nullsLast().op("timestamptz_ops"),
      table.createdAt.desc().nullsFirst().op("timestamptz_ops")
    ),
    foreignKey({
      columns: [table.actorId],
      foreignColumns: [profiles.userId],
      name: "changes_log_actor_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.branchId],
      foreignColumns: [notebookBranches.id],
      name: "changes_log_branch_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.notebookId],
      foreignColumns: [notebooks.id],
      name: "changes_log_notebook_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("insert_changes_log_for_members", {
      as: "permissive",
      for: "insert",
      to: ["public"],
      withCheck: sql`is_notebook_member(notebook_id)`,
    }),
    pgPolicy("select_changes_log_for_members", { as: "permissive", for: "select", to: ["public"] }),
  ]
)

export const simulations = pgTable(
  "simulations",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    notebookId: uuid("notebook_id").notNull(),
    branchId: uuid("branch_id"),
    startedBy: uuid("started_by"),
    status: simulationStatus().default("queued").notNull(),
    startedTs: timestamp("started_ts", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    finishedTs: timestamp("finished_ts", { withTimezone: true, mode: "string" }),
    iterations: integer().default(100000).notNull(),
    engineVersion: text("engine_version").default("1.0").notNull(),
    inputHash: text("input_hash").notNull(),
    inputSnapshot: jsonb("input_snapshot").notNull(),
    results: jsonb(),
    summary: jsonb(),
    error: text(),
  },
  (table) => [
    index("simulations_notebook_id_started_ts_idx").using(
      "btree",
      table.notebookId.asc().nullsLast().op("timestamptz_ops"),
      table.startedTs.desc().nullsFirst().op("timestamptz_ops")
    ),
    foreignKey({
      columns: [table.branchId],
      foreignColumns: [notebookBranches.id],
      name: "simulations_branch_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.notebookId],
      foreignColumns: [notebooks.id],
      name: "simulations_notebook_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.startedBy],
      foreignColumns: [profiles.userId],
      name: "simulations_started_by_fkey",
    }).onDelete("set null"),
    pgPolicy("insert_simulations_for_members", {
      as: "permissive",
      for: "insert",
      to: ["public"],
      withCheck: sql`is_notebook_member(notebook_id)`,
    }),
    pgPolicy("select_simulations_for_members", { as: "permissive", for: "select", to: ["public"] }),
  ]
)
