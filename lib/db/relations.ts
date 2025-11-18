import { relations } from "drizzle-orm/relations"
import {
  organizations,
  profiles,
  usersInAuth,
  organizationMembers,
  simulations,
  notebooks,
  notebookCategories,
  notebookMetrics,
  notebookFormulas,
  notebookCollaborators,
  notebookInvites,
  notebookBranches,
  branchSnapshots,
  changesLog,
} from "./schema"

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [profiles.organizationId],
    references: [organizations.id],
  }),
  usersInAuth: one(usersInAuth, {
    fields: [profiles.userId],
    references: [usersInAuth.id],
  }),
  organizationMembers_invitedBy: many(organizationMembers, {
    relationName: "organizationMembers_invitedBy_profiles_userId",
  }),
  organizationMembers_userId: many(organizationMembers, {
    relationName: "organizationMembers_userId_profiles_userId",
  }),
  notebooks: many(notebooks),
  notebookCategories: many(notebookCategories),
  notebookMetrics_createUserId: many(notebookMetrics, {
    relationName: "notebookMetrics_createUserId_profiles_userId",
  }),
  notebookMetrics_lastUpdatedUserId: many(notebookMetrics, {
    relationName: "notebookMetrics_lastUpdatedUserId_profiles_userId",
  }),
  notebookFormulas_createUserId: many(notebookFormulas, {
    relationName: "notebookFormulas_createUserId_profiles_userId",
  }),
  notebookFormulas_lastUpdatedUserId: many(notebookFormulas, {
    relationName: "notebookFormulas_lastUpdatedUserId_profiles_userId",
  }),
  notebookCollaborators: many(notebookCollaborators),
  notebookInvites: many(notebookInvites),
  notebookBranches: many(notebookBranches),
  changesLogs: many(changesLog),
  simulations: many(simulations),
}))

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  profiles: many(profiles),
  usersInAuth: one(usersInAuth, {
    fields: [organizations.createdBy],
    references: [usersInAuth.id],
  }),
  organizationMembers: many(organizationMembers),
  notebooks: many(notebooks),
}))

export const usersInAuthRelations = relations(usersInAuth, ({ many }) => ({
  profiles: many(profiles),
  organizations: many(organizations),
}))

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  profile_invitedBy: one(profiles, {
    fields: [organizationMembers.invitedBy],
    references: [profiles.userId],
    relationName: "organizationMembers_invitedBy_profiles_userId",
  }),
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  profile_userId: one(profiles, {
    fields: [organizationMembers.userId],
    references: [profiles.userId],
    relationName: "organizationMembers_userId_profiles_userId",
  }),
}))

export const notebooksRelations = relations(notebooks, ({ one, many }) => ({
  simulation: one(simulations, {
    fields: [notebooks.lastSimulationId],
    references: [simulations.id],
    relationName: "notebooks_lastSimulationId_simulations_id",
  }),
  organization: one(organizations, {
    fields: [notebooks.organizationId],
    references: [organizations.id],
  }),
  profile: one(profiles, {
    fields: [notebooks.ownerId],
    references: [profiles.userId],
  }),
  notebookCategories: many(notebookCategories),
  notebookMetrics: many(notebookMetrics),
  notebookFormulas: many(notebookFormulas),
  notebookCollaborators: many(notebookCollaborators),
  notebookInvites: many(notebookInvites),
  notebookBranches: many(notebookBranches),
  changesLogs: many(changesLog),
  simulations: many(simulations, {
    relationName: "simulations_notebookId_notebooks_id",
  }),
}))

export const simulationsRelations = relations(simulations, ({ one, many }) => ({
  notebooks: many(notebooks, {
    relationName: "notebooks_lastSimulationId_simulations_id",
  }),
  branchSnapshots: many(branchSnapshots),
  notebookBranch: one(notebookBranches, {
    fields: [simulations.branchId],
    references: [notebookBranches.id],
  }),
  notebook: one(notebooks, {
    fields: [simulations.notebookId],
    references: [notebooks.id],
    relationName: "simulations_notebookId_notebooks_id",
  }),
  profile: one(profiles, {
    fields: [simulations.startedBy],
    references: [profiles.userId],
  }),
}))

export const notebookCategoriesRelations = relations(notebookCategories, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [notebookCategories.createdBy],
    references: [profiles.userId],
  }),
  notebook: one(notebooks, {
    fields: [notebookCategories.notebookId],
    references: [notebooks.id],
  }),
  notebookMetrics: many(notebookMetrics),
  notebookFormulas: many(notebookFormulas),
}))

export const notebookMetricsRelations = relations(notebookMetrics, ({ one }) => ({
  notebookCategory: one(notebookCategories, {
    fields: [notebookMetrics.categoryId],
    references: [notebookCategories.id],
  }),
  profile_createUserId: one(profiles, {
    fields: [notebookMetrics.createUserId],
    references: [profiles.userId],
    relationName: "notebookMetrics_createUserId_profiles_userId",
  }),
  profile_lastUpdatedUserId: one(profiles, {
    fields: [notebookMetrics.lastUpdatedUserId],
    references: [profiles.userId],
    relationName: "notebookMetrics_lastUpdatedUserId_profiles_userId",
  }),
  notebook: one(notebooks, {
    fields: [notebookMetrics.notebookId],
    references: [notebooks.id],
  }),
}))

export const notebookFormulasRelations = relations(notebookFormulas, ({ one }) => ({
  notebookCategory: one(notebookCategories, {
    fields: [notebookFormulas.categoryId],
    references: [notebookCategories.id],
  }),
  profile_createUserId: one(profiles, {
    fields: [notebookFormulas.createUserId],
    references: [profiles.userId],
    relationName: "notebookFormulas_createUserId_profiles_userId",
  }),
  profile_lastUpdatedUserId: one(profiles, {
    fields: [notebookFormulas.lastUpdatedUserId],
    references: [profiles.userId],
    relationName: "notebookFormulas_lastUpdatedUserId_profiles_userId",
  }),
  notebook: one(notebooks, {
    fields: [notebookFormulas.notebookId],
    references: [notebooks.id],
  }),
}))

export const notebookCollaboratorsRelations = relations(notebookCollaborators, ({ one }) => ({
  notebook: one(notebooks, {
    fields: [notebookCollaborators.notebookId],
    references: [notebooks.id],
  }),
  profile: one(profiles, {
    fields: [notebookCollaborators.userId],
    references: [profiles.userId],
  }),
}))

export const notebookInvitesRelations = relations(notebookInvites, ({ one }) => ({
  profile: one(profiles, {
    fields: [notebookInvites.invitedBy],
    references: [profiles.userId],
  }),
  notebook: one(notebooks, {
    fields: [notebookInvites.notebookId],
    references: [notebooks.id],
  }),
}))

export const notebookBranchesRelations = relations(notebookBranches, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [notebookBranches.createdBy],
    references: [profiles.userId],
  }),
  notebook: one(notebooks, {
    fields: [notebookBranches.notebookId],
    references: [notebooks.id],
  }),
  notebookBranch: one(notebookBranches, {
    fields: [notebookBranches.parentBranchId],
    references: [notebookBranches.id],
    relationName: "notebookBranches_parentBranchId_notebookBranches_id",
  }),
  notebookBranches: many(notebookBranches, {
    relationName: "notebookBranches_parentBranchId_notebookBranches_id",
  }),
  branchSnapshots: many(branchSnapshots),
  changesLogs: many(changesLog),
  simulations: many(simulations),
}))

export const branchSnapshotsRelations = relations(branchSnapshots, ({ one }) => ({
  simulation: one(simulations, {
    fields: [branchSnapshots.baseSimulationId],
    references: [simulations.id],
  }),
  notebookBranch: one(notebookBranches, {
    fields: [branchSnapshots.branchId],
    references: [notebookBranches.id],
  }),
}))

export const changesLogRelations = relations(changesLog, ({ one }) => ({
  profile: one(profiles, {
    fields: [changesLog.actorId],
    references: [profiles.userId],
  }),
  notebookBranch: one(notebookBranches, {
    fields: [changesLog.branchId],
    references: [notebookBranches.id],
  }),
  notebook: one(notebooks, {
    fields: [changesLog.notebookId],
    references: [notebooks.id],
  }),
}))
