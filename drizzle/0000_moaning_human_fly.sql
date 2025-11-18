-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."change_kind" AS ENUM('permission', 'simulation', 'branch');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('invited', 'accepted', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."notebook_permission" AS ENUM('owner', 'editor', 'commenter', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('admin', 'modeler', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."simulation_status" AS ENUM('queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text,
	"handle" text,
	"avatar_url" text,
	"organization_id" uuid,
	"title" text,
	"timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_handle_key" UNIQUE("handle")
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organizations_domain_key" UNIQUE("domain")
);
--> statement-breakpoint
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "org_role" DEFAULT 'viewer' NOT NULL,
	"status" "membership_status" DEFAULT 'invited' NOT NULL,
	"invited_by" uuid,
	"invited_email" "citext",
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE("organization_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "organization_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notebooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"organization_id" uuid,
	"owner_id" uuid NOT NULL,
	"sharing_token" uuid DEFAULT gen_random_uuid(),
	"is_dirty" boolean DEFAULT false NOT NULL,
	"dirty_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_simulation_id" uuid,
	"last_viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "notebooks_sharing_token_key" UNIQUE("sharing_token")
);
--> statement-breakpoint
ALTER TABLE "notebooks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notebook_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notebook_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"time_period" text,
	"total_formula_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notebook_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notebook_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notebook_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"unit" text,
	"distribution" jsonb,
	"value" numeric,
	"description" text,
	"tags" text[] DEFAULT '{""}' NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_user_id" uuid,
	"last_updated_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notebook_metrics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notebook_formulas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notebook_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"expression" text NOT NULL,
	"ast" jsonb,
	"dependent_metrics" uuid[] DEFAULT '{""}' NOT NULL,
	"dependent_formulas" uuid[] DEFAULT '{""}' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_user_id" uuid,
	"last_updated_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notebook_formulas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notebook_collaborators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notebook_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permission" "notebook_permission" DEFAULT 'viewer' NOT NULL,
	"can_run_simulations" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notebook_collaborators_notebook_id_user_id_key" UNIQUE("notebook_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "notebook_collaborators" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notebook_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notebook_id" uuid NOT NULL,
	"email" "citext" NOT NULL,
	"permission" "notebook_permission" DEFAULT 'viewer' NOT NULL,
	"message" text,
	"invited_by" uuid,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notebook_invites_notebook_id_email_key" UNIQUE("notebook_id","email")
);
--> statement-breakpoint
ALTER TABLE "notebook_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notebook_branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notebook_id" uuid NOT NULL,
	"parent_branch_id" uuid,
	"created_by" uuid,
	"name" text NOT NULL,
	"notes" text,
	"is_customer_branch" boolean DEFAULT false NOT NULL,
	"share_back" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"merged_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notebook_branches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "branch_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"base_simulation_id" uuid,
	"diff" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branch_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "changes_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notebook_id" uuid NOT NULL,
	"branch_id" uuid,
	"actor_id" uuid,
	"change_type" "change_kind" NOT NULL,
	"entity_id" uuid,
	"summary" text,
	"prev_state" jsonb,
	"next_state" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "changes_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "simulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notebook_id" uuid NOT NULL,
	"branch_id" uuid,
	"started_by" uuid,
	"status" "simulation_status" DEFAULT 'queued' NOT NULL,
	"started_ts" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_ts" timestamp with time zone,
	"iterations" integer DEFAULT 100000 NOT NULL,
	"engine_version" text DEFAULT '1.0' NOT NULL,
	"input_hash" text NOT NULL,
	"input_snapshot" jsonb NOT NULL,
	"results" jsonb,
	"summary" jsonb,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "simulations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_last_simulation_fk" FOREIGN KEY ("last_simulation_id") REFERENCES "public"."simulations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_categories" ADD CONSTRAINT "notebook_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_categories" ADD CONSTRAINT "notebook_categories_notebook_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_metrics" ADD CONSTRAINT "notebook_metrics_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."notebook_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_metrics" ADD CONSTRAINT "notebook_metrics_create_user_id_fkey" FOREIGN KEY ("create_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_metrics" ADD CONSTRAINT "notebook_metrics_last_updated_user_id_fkey" FOREIGN KEY ("last_updated_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_metrics" ADD CONSTRAINT "notebook_metrics_notebook_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_formulas" ADD CONSTRAINT "notebook_formulas_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."notebook_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_formulas" ADD CONSTRAINT "notebook_formulas_create_user_id_fkey" FOREIGN KEY ("create_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_formulas" ADD CONSTRAINT "notebook_formulas_last_updated_user_id_fkey" FOREIGN KEY ("last_updated_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_formulas" ADD CONSTRAINT "notebook_formulas_notebook_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_collaborators" ADD CONSTRAINT "notebook_collaborators_notebook_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_collaborators" ADD CONSTRAINT "notebook_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_invites" ADD CONSTRAINT "notebook_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_invites" ADD CONSTRAINT "notebook_invites_notebook_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_branches" ADD CONSTRAINT "notebook_branches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_branches" ADD CONSTRAINT "notebook_branches_notebook_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_branches" ADD CONSTRAINT "notebook_branches_parent_branch_id_fkey" FOREIGN KEY ("parent_branch_id") REFERENCES "public"."notebook_branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_snapshots" ADD CONSTRAINT "branch_snapshots_base_simulation_id_fkey" FOREIGN KEY ("base_simulation_id") REFERENCES "public"."simulations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_snapshots" ADD CONSTRAINT "branch_snapshots_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."notebook_branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changes_log" ADD CONSTRAINT "changes_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changes_log" ADD CONSTRAINT "changes_log_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."notebook_branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changes_log" ADD CONSTRAINT "changes_log_notebook_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."notebook_branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_notebook_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_members_user_id_idx" ON "organization_members" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "notebooks_owner_id_updated_at_idx" ON "notebooks" USING btree ("owner_id" timestamptz_ops,"updated_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "notebook_categories_notebook_id_order_index_idx" ON "notebook_categories" USING btree ("notebook_id" int4_ops,"order_index" int4_ops);--> statement-breakpoint
CREATE INDEX "notebook_metrics_notebook_id_category_id_order_index_idx" ON "notebook_metrics" USING btree ("notebook_id" uuid_ops,"category_id" int4_ops,"order_index" uuid_ops);--> statement-breakpoint
CREATE INDEX "notebook_formulas_notebook_id_category_id_idx" ON "notebook_formulas" USING btree ("notebook_id" uuid_ops,"category_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "notebook_collaborators_user_id_idx" ON "notebook_collaborators" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "notebook_invites_email_idx" ON "notebook_invites" USING btree ("email" citext_ops);--> statement-breakpoint
CREATE INDEX "notebook_branches_notebook_id_idx" ON "notebook_branches" USING btree ("notebook_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "changes_log_notebook_id_created_at_idx" ON "changes_log" USING btree ("notebook_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "simulations_notebook_id_started_ts_idx" ON "simulations" USING btree ("notebook_id" timestamptz_ops,"started_ts" timestamptz_ops);--> statement-breakpoint
CREATE POLICY "org_member_profiles" ON "profiles" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.user_id = profiles.user_id) AND (om.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));--> statement-breakpoint
CREATE POLICY "profiles_self" ON "profiles" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "org_units_manage" ON "organizations" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = organizations.id) AND (om.user_id = auth.uid())))));--> statement-breakpoint
CREATE POLICY "delete_org_members_for_admins" ON "organization_members" AS PERMISSIVE FOR DELETE TO public USING (is_org_admin(organization_id));--> statement-breakpoint
CREATE POLICY "insert_org_members_for_admins" ON "organization_members" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "select_org_members_for_members" ON "organization_members" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "update_org_members_for_admins" ON "organization_members" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "delete_notebooks_for_managers" ON "notebooks" AS PERMISSIVE FOR DELETE TO public USING (can_manage_notebook_collaborators(id));--> statement-breakpoint
CREATE POLICY "insert_notebooks_for_owner" ON "notebooks" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "select_notebooks_for_members" ON "notebooks" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "update_notebooks_for_editors" ON "notebooks" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "delete_notebook_categories_for_editors" ON "notebook_categories" AS PERMISSIVE FOR DELETE TO public USING (is_notebook_editor(notebook_id));--> statement-breakpoint
CREATE POLICY "insert_notebook_categories_for_editors" ON "notebook_categories" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "select_notebook_categories_for_members" ON "notebook_categories" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "update_notebook_categories_for_editors" ON "notebook_categories" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "delete_notebook_metrics_for_editors" ON "notebook_metrics" AS PERMISSIVE FOR DELETE TO public USING (is_notebook_editor(notebook_id));--> statement-breakpoint
CREATE POLICY "insert_notebook_metrics_for_editors" ON "notebook_metrics" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "select_notebook_metrics_for_members" ON "notebook_metrics" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "update_notebook_metrics_for_editors" ON "notebook_metrics" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "delete_notebook_formulas_for_editors" ON "notebook_formulas" AS PERMISSIVE FOR DELETE TO public USING (is_notebook_editor(notebook_id));--> statement-breakpoint
CREATE POLICY "insert_notebook_formulas_for_editors" ON "notebook_formulas" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "select_notebook_formulas_for_members" ON "notebook_formulas" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "update_notebook_formulas_for_editors" ON "notebook_formulas" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "delete_notebook_collaborators_for_managers" ON "notebook_collaborators" AS PERMISSIVE FOR DELETE TO public USING (can_manage_notebook_collaborators(notebook_id));--> statement-breakpoint
CREATE POLICY "insert_notebook_collaborators_for_managers" ON "notebook_collaborators" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "select_notebook_collaborators_for_members" ON "notebook_collaborators" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "update_notebook_collaborators_for_managers" ON "notebook_collaborators" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "delete_notebook_invites_for_managers" ON "notebook_invites" AS PERMISSIVE FOR DELETE TO public USING (can_manage_notebook_collaborators(notebook_id));--> statement-breakpoint
CREATE POLICY "insert_notebook_invites_for_managers" ON "notebook_invites" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "select_notebook_invites_for_managers" ON "notebook_invites" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "update_notebook_invites_for_managers" ON "notebook_invites" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "delete_notebook_branches_for_managers" ON "notebook_branches" AS PERMISSIVE FOR DELETE TO public USING (can_manage_notebook_collaborators(notebook_id));--> statement-breakpoint
CREATE POLICY "insert_notebook_branches_for_editors" ON "notebook_branches" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "select_notebook_branches_for_members" ON "notebook_branches" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "update_notebook_branches_for_editors" ON "notebook_branches" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "delete_branch_snapshots_for_managers" ON "branch_snapshots" AS PERMISSIVE FOR DELETE TO public USING (can_manage_branch(branch_id));--> statement-breakpoint
CREATE POLICY "insert_branch_snapshots_for_editors" ON "branch_snapshots" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "select_branch_snapshots_for_members" ON "branch_snapshots" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "update_branch_snapshots_for_editors" ON "branch_snapshots" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "insert_changes_log_for_members" ON "changes_log" AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_notebook_member(notebook_id));--> statement-breakpoint
CREATE POLICY "select_changes_log_for_members" ON "changes_log" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "insert_simulations_for_members" ON "simulations" AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_notebook_member(notebook_id));--> statement-breakpoint
CREATE POLICY "select_simulations_for_members" ON "simulations" AS PERMISSIVE FOR SELECT TO public;
*/