-- =============================================================================
-- ROI Mock Data Seeder
-- =============================================================================
-- This script hydrates the relational schema defined in
-- `supabase/migrations/20251117073440_initial_schema.sql` with the structures
-- published in `lib/mock-data.ts`.
--
-- Usage:
--   1. Ensure at least one Supabase auth user exists (via Dashboard or CLI).
--   2. Optionally override the email that should own the seeded data:
--        select set_config('app.mock_owner_email', 'you@example.com', false);
--   3. Run the script with `psql` or `supabase db remote commit -f supabase/mock_data_seed.sql`.
--
-- The script is idempotent thanks to the ON CONFLICT clauses, so running it
-- multiple times will upsert the same notebook graph.
-- =============================================================================
\echo '🌱 Seeding ROI mock data (lib/mock-data.ts) into public schema...'

begin;

do $$
declare
  owner_email text := coalesce(current_setting('app.mock_owner_email', true), 'ava@roi.ai');
  owner_user_id uuid;
  org_namespace constant uuid := '5ce2beef-6cf0-4c40-86f5-5619157af001';
  notebook_namespace constant uuid := '5ce2beef-6cf0-4c40-86f5-5619157af002';
  category_namespace constant uuid := '5ce2beef-6cf0-4c40-86f5-5619157af003';
  metric_namespace constant uuid := '5ce2beef-6cf0-4c40-86f5-5619157af004';
  formula_namespace constant uuid := '5ce2beef-6cf0-4c40-86f5-5619157af005';
  membership_namespace constant uuid := '5ce2beef-6cf0-4c40-86f5-5619157af006';
  simulation_namespace constant uuid := '5ce2beef-6cf0-4c40-86f5-5619157af007';
  organization_id uuid := uuid_generate_v5(org_namespace, 'roi-enterprise-labs');
  notebook_id uuid := uuid_generate_v5(notebook_namespace, 'ai-roi-analysis-devops');
  simulation_id uuid := uuid_generate_v5(simulation_namespace, 'ai-roi-analysis-devops');
begin
  select id
    into owner_user_id
    from auth.users
   where email = owner_email
   limit 1;

  if owner_user_id is null then
    raise exception
      'No auth.users row was found for % (set app.mock_owner_email before running this seed).',
      owner_email;
  end if;

  insert into public.organizations (id, name, domain, created_by)
  values (
    organization_id,
    'ROI Enterprise Labs',
    'roi.internal',
    owner_user_id
  )
  on conflict (id) do update
  set
    name = excluded.name,
    domain = excluded.domain,
    updated_at = now();

  insert into public.profiles (user_id, full_name, handle, avatar_url, organization_id, title, timezone)
  values (
    owner_user_id,
    'Ava Maxwell',
    'ava-maxwell',
    null,
    organization_id,
    'Head of Value Engineering',
    'America/Los_Angeles'
  )
  on conflict (user_id) do update
  set
    full_name = excluded.full_name,
    handle = excluded.handle,
    organization_id = excluded.organization_id,
    title = excluded.title,
    timezone = excluded.timezone,
    updated_at = now();

  insert into public.organization_members (id, organization_id, user_id, role, status, invited_by, invited_email, joined_at)
  values (
    uuid_generate_v5(membership_namespace, owner_user_id::text),
    organization_id,
    owner_user_id,
    'admin',
    'accepted',
    owner_user_id,
    owner_email,
    now()
  )
  on conflict (organization_id, user_id) do update
  set
    role = excluded.role,
    status = excluded.status,
    invited_by = excluded.invited_by,
    invited_email = excluded.invited_email,
    joined_at = excluded.joined_at,
    updated_at = now();

  insert into public.notebooks (id, name, description, organization_id, owner_id, is_dirty, dirty_fields, last_simulation_id)
  values (
    notebook_id,
    'AI ROI Analysis - DevOps Automation',
    'Monte Carlo NPV analysis for AI implementation in DevOps',
    organization_id,
    owner_user_id,
    false,
    '{}'::jsonb,
    null
  )
  on conflict (id) do update
  set
    name = excluded.name,
    description = excluded.description,
    organization_id = excluded.organization_id,
    owner_id = excluded.owner_id,
    is_dirty = excluded.is_dirty,
    dirty_fields = excluded.dirty_fields,
    updated_at = now();

  with category_source as (
    select *
    from (values
      ('cat-facts', 'Facts & Assumptions', 'Company-specific parameters', 0),
      ('cat-time-savings', 'Time Savings Benefits (Internal)', 'Productivity improvements from AI automation', 1),
      ('cat-quality', 'Quality Improvement Benefits', 'Preventing post-release bugs', 2),
      ('cat-product-delivery', 'Product Delivery Benefits (External)', 'Revenue impact from faster feature delivery', 3),
      ('cat-retention', 'Employee Retention Benefits', 'Cost savings from reduced turnover', 4),
      ('cat-costs', 'AI Implementation Costs', 'Ongoing costs for AI tools and support', 5)
    ) as cat(slug, name, description, order_index)
  )
  insert into public.notebook_categories (id, notebook_id, name, description, order_index, created_by)
  select
    uuid_generate_v5(category_namespace, slug),
    notebook_id,
    name,
    description,
    order_index,
    owner_user_id
  from category_source
  on conflict (id) do update
  set
    notebook_id = excluded.notebook_id,
    name = excluded.name,
    description = excluded.description,
    order_index = excluded.order_index,
    created_by = excluded.created_by,
    updated_at = now();

  with metric_source as (
    select *
    from (values
      (1, 'number_of_employees', 'Number of Employees', 'Total number of employees affected by AI implementation', 'count', null::jsonb, 50::numeric, 'cat-facts'),
      (2, 'avg_yearly_cost_per_employee', 'Avg Yearly Fully Loaded Cost Per Employee', 'Includes salary, benefits, and overhead', '$/year', null::jsonb, 230000::numeric, 'cat-facts'),
      (3, 'discount_rate', 'Discount Rate', 'Weighted Average Cost of Capital (WACC)', '%', jsonb_build_object('min', 0.15, 'mode', 0.25, 'max', 0.35), null::numeric, 'cat-facts'),
      (4, 'weekly_hours_saved_per_employee', 'Weekly Hours Saved per Employee', 'Time saved through AI automation per employee per week', 'hours/week', jsonb_build_object('min', 2, 'mode', 5, 'max', 8), null::numeric, 'cat-time-savings'),
      (5, 'productivity_conversion_rate', 'Productivity Conversion Rate', 'Rate at which saved time is re-deployed as productive work', '%', jsonb_build_object('min', 0.3, 'mode', 0.5, 'max', 0.7), null::numeric, 'cat-time-savings'),
      (6, 'time_savings_monetary_value', 'Time Savings Monetary Value', 'Annualized value created from reallocated hours', '$/year', null::jsonb, 0::numeric, 'cat-time-savings'),
      (7, 'bug_reduction_rate', 'Bug Reduction Rate', 'Percentage reduction in post-release bugs', '%', jsonb_build_object('min', 0.0, 'mode', 0.2, 'max', 0.3), null::numeric, 'cat-quality'),
      (8, 'bug_time_rate', 'Bug Time Rate', 'Fraction of employee time spent on bug remediation', '%', jsonb_build_object('min', 0.2, 'mode', 0.3, 'max', 0.6), null::numeric, 'cat-quality'),
      (9, 'external_bug_cost', 'External Bug Cost', 'Yearly cost of customer churn and lost revenue due to bugs', '$/year', jsonb_build_object('min', 0, 'mode', 20000, 'max', 100000), null::numeric, 'cat-quality'),
      (10, 'feature_delivery_rate', 'Feature Delivery Rate', 'Percentage uplift in feature shipping speed', '%', jsonb_build_object('min', 0.1, 'mode', 0.25, 'max', 0.4), null::numeric, 'cat-product-delivery'),
      (11, 'feature_attribution_factor', 'Feature Attribution Factor', 'Fraction of new customer acquisition attributed to new features', '%', jsonb_build_object('min', 0, 'mode', 0.1, 'max', 0.2), null::numeric, 'cat-product-delivery'),
      (12, 'new_customers_per_year', 'New Customers per Year', 'Expected new customer acquisition rate', 'count/year', jsonb_build_object('min', 10000, 'mode', 100000, 'max', 250000), null::numeric, 'cat-product-delivery'),
      (13, 'yearly_customer_value', 'Yearly Customer Value', 'Average revenue per customer per year', '$/year', jsonb_build_object('min', 5, 'mode', 10, 'max', 15), null::numeric, 'cat-product-delivery'),
      (14, 'retention_improvement_rate', 'Retention Improvement Rate', 'Reduction in employee turnover due to better tools', '%', jsonb_build_object('min', 0, 'mode', 0.1, 'max', 0.4), null::numeric, 'cat-retention'),
      (15, 'current_yearly_turnover_rate', 'Current Yearly Turnover Rate', 'Baseline employee turnover rate', '%', null::jsonb, 0.2::numeric, 'cat-retention'),
      (16, 'replacement_cost_per_employee', 'Replacement Cost per Employee', 'Total cost of recruiting, training, and lost productivity', '$', jsonb_build_object('min', 60000, 'mode', 75000, 'max', 90000), null::numeric, 'cat-retention'),
      (17, 'yearly_tool_cost', 'Yearly Tool Cost', 'Annual subscription cost for AI tools', '$/year', jsonb_build_object('min', 30000, 'mode', 50000, 'max', 70000), null::numeric, 'cat-costs'),
      (18, 'yearly_monitoring_support_cost', 'Yearly Monitoring and Support Cost', 'Ongoing operational costs', '$/year', jsonb_build_object('min', 10000, 'mode', 15000, 'max', 25000), null::numeric, 'cat-costs'),
      (19, 'first_year_change_management_cost', 'First Year Change Management Cost', 'One-time training and change management costs', '$', jsonb_build_object('min', 15000, 'mode', 25000, 'max', 45000), null::numeric, 'cat-costs'),
      (20, 'yearly_ai_staff_cost', 'Yearly AI Staff Cost', 'Dedicated AI/ML engineering staff costs', '$/year', null::jsonb, 300000::numeric, 'cat-costs')
    ) as metric(order_index, slug, name, description, unit, distribution_json, value_numeric, category_slug)
  )
  insert into public.notebook_metrics (
    id,
    notebook_id,
    category_id,
    name,
    unit,
    distribution,
    value,
    description,
    tags,
    is_locked,
    order_index,
    version,
    create_user_id,
    last_updated_user_id
  )
  select
    uuid_generate_v5(metric_namespace, slug),
    notebook_id,
    uuid_generate_v5(category_namespace, category_slug),
    name,
    unit,
    distribution_json,
    value_numeric,
    description,
    array[]::text[],
    false,
    order_index,
    1,
    owner_user_id,
    owner_user_id
  from metric_source
  on conflict (id) do update
  set
    category_id = excluded.category_id,
    name = excluded.name,
    unit = excluded.unit,
    distribution = excluded.distribution,
    value = excluded.value,
    description = excluded.description,
    tags = excluded.tags,
    is_locked = excluded.is_locked,
    order_index = excluded.order_index,
    version = excluded.version,
    last_updated_user_id = excluded.last_updated_user_id,
    updated_at = now();

  with formula_source as (
    select *
    from (values
      (
        'formula_time_savings_total',
        'Annual Time Savings',
        'cat-time-savings',
        'weekly_hours_saved_per_employee * number_of_employees * 48 * (avg_yearly_cost_per_employee / (48 * 40)) * productivity_conversion_rate',
        array[
          uuid_generate_v5(metric_namespace, 'weekly_hours_saved_per_employee'),
          uuid_generate_v5(metric_namespace, 'number_of_employees'),
          uuid_generate_v5(metric_namespace, 'avg_yearly_cost_per_employee'),
          uuid_generate_v5(metric_namespace, 'productivity_conversion_rate')
        ]::uuid[],
        array[]::uuid[]
      ),
      (
        'formula_quality_savings',
        'Annual Quality Savings',
        'cat-quality',
        'external_bug_cost * bug_reduction_rate + avg_yearly_cost_per_employee * number_of_employees * bug_time_rate * bug_reduction_rate',
        array[
          uuid_generate_v5(metric_namespace, 'external_bug_cost'),
          uuid_generate_v5(metric_namespace, 'bug_reduction_rate'),
          uuid_generate_v5(metric_namespace, 'avg_yearly_cost_per_employee'),
          uuid_generate_v5(metric_namespace, 'number_of_employees'),
          uuid_generate_v5(metric_namespace, 'bug_time_rate')
        ]::uuid[],
        array[]::uuid[]
      ),
      (
        'formula_product_revenue_impact',
        'Annual Revenue Impact',
        'cat-product-delivery',
        'feature_delivery_rate * new_customers_per_year * yearly_customer_value * feature_attribution_factor',
        array[
          uuid_generate_v5(metric_namespace, 'feature_delivery_rate'),
          uuid_generate_v5(metric_namespace, 'new_customers_per_year'),
          uuid_generate_v5(metric_namespace, 'yearly_customer_value'),
          uuid_generate_v5(metric_namespace, 'feature_attribution_factor')
        ]::uuid[],
        array[]::uuid[]
      ),
      (
        'formula_retention_savings',
        'Annual Retention Savings',
        'cat-retention',
        'retention_improvement_rate * current_yearly_turnover_rate * number_of_employees * replacement_cost_per_employee',
        array[
          uuid_generate_v5(metric_namespace, 'retention_improvement_rate'),
          uuid_generate_v5(metric_namespace, 'current_yearly_turnover_rate'),
          uuid_generate_v5(metric_namespace, 'number_of_employees'),
          uuid_generate_v5(metric_namespace, 'replacement_cost_per_employee')
        ]::uuid[],
        array[]::uuid[]
      ),
      (
        'formula_total_annual_benefits',
        'Total Annual Benefits',
        'cat-facts',
        'formula_time_savings_total + formula_quality_savings + formula_product_revenue_impact + formula_retention_savings',
        array[]::uuid[],
        array[
          uuid_generate_v5(formula_namespace, 'formula_time_savings_total'),
          uuid_generate_v5(formula_namespace, 'formula_quality_savings'),
          uuid_generate_v5(formula_namespace, 'formula_product_revenue_impact'),
          uuid_generate_v5(formula_namespace, 'formula_retention_savings')
        ]::uuid[]
      ),
      (
        'formula_ongoing_costs',
        'Ongoing Annual Costs',
        'cat-costs',
        'yearly_tool_cost + yearly_monitoring_support_cost + yearly_ai_staff_cost',
        array[
          uuid_generate_v5(metric_namespace, 'yearly_tool_cost'),
          uuid_generate_v5(metric_namespace, 'yearly_monitoring_support_cost'),
          uuid_generate_v5(metric_namespace, 'yearly_ai_staff_cost')
        ]::uuid[],
        array[]::uuid[]
      ),
      (
        'formula_year_1_net',
        'Year 1 Net Cash Flow',
        'cat-facts',
        '(formula_time_savings_total + formula_quality_savings + formula_product_revenue_impact + formula_retention_savings) - first_year_change_management_cost - yearly_tool_cost - yearly_monitoring_support_cost - yearly_ai_staff_cost',
        array[
          uuid_generate_v5(metric_namespace, 'first_year_change_management_cost'),
          uuid_generate_v5(metric_namespace, 'yearly_tool_cost'),
          uuid_generate_v5(metric_namespace, 'yearly_monitoring_support_cost'),
          uuid_generate_v5(metric_namespace, 'yearly_ai_staff_cost')
        ]::uuid[],
        array[
          uuid_generate_v5(formula_namespace, 'formula_time_savings_total'),
          uuid_generate_v5(formula_namespace, 'formula_quality_savings'),
          uuid_generate_v5(formula_namespace, 'formula_product_revenue_impact'),
          uuid_generate_v5(formula_namespace, 'formula_retention_savings')
        ]::uuid[]
      ),
      (
        'formula_year_2_net',
        'Year 2 Net Cash Flow',
        'cat-facts',
        '(formula_time_savings_total + formula_quality_savings + formula_product_revenue_impact + formula_retention_savings) - yearly_tool_cost - yearly_monitoring_support_cost - yearly_ai_staff_cost',
        array[
          uuid_generate_v5(metric_namespace, 'yearly_tool_cost'),
          uuid_generate_v5(metric_namespace, 'yearly_monitoring_support_cost'),
          uuid_generate_v5(metric_namespace, 'yearly_ai_staff_cost')
        ]::uuid[],
        array[
          uuid_generate_v5(formula_namespace, 'formula_time_savings_total'),
          uuid_generate_v5(formula_namespace, 'formula_quality_savings'),
          uuid_generate_v5(formula_namespace, 'formula_product_revenue_impact'),
          uuid_generate_v5(formula_namespace, 'formula_retention_savings')
        ]::uuid[]
      ),
      (
        'formula_year_3_net',
        'Year 3 Net Cash Flow',
        'cat-facts',
        '(formula_time_savings_total + formula_quality_savings + formula_product_revenue_impact + formula_retention_savings) - yearly_tool_cost - yearly_monitoring_support_cost - yearly_ai_staff_cost',
        array[
          uuid_generate_v5(metric_namespace, 'yearly_tool_cost'),
          uuid_generate_v5(metric_namespace, 'yearly_monitoring_support_cost'),
          uuid_generate_v5(metric_namespace, 'yearly_ai_staff_cost')
        ]::uuid[],
        array[
          uuid_generate_v5(formula_namespace, 'formula_time_savings_total'),
          uuid_generate_v5(formula_namespace, 'formula_quality_savings'),
          uuid_generate_v5(formula_namespace, 'formula_product_revenue_impact'),
          uuid_generate_v5(formula_namespace, 'formula_retention_savings')
        ]::uuid[]
      ),
      (
        'formula_npv_3_year',
        'NPV (3 Years)',
        'cat-facts',
        '(((formula_time_savings_total + formula_quality_savings + formula_product_revenue_impact + formula_retention_savings) - first_year_change_management_cost - yearly_tool_cost - yearly_monitoring_support_cost - yearly_ai_staff_cost) / ((avg_yearly_cost_per_employee / avg_yearly_cost_per_employee) + discount_rate)) + (((formula_time_savings_total + formula_quality_savings + formula_product_revenue_impact + formula_retention_savings) - yearly_tool_cost - yearly_monitoring_support_cost - yearly_ai_staff_cost) / (((avg_yearly_cost_per_employee / avg_yearly_cost_per_employee) + discount_rate) * ((avg_yearly_cost_per_employee / avg_yearly_cost_per_employee) + discount_rate))) + (((formula_time_savings_total + formula_quality_savings + formula_product_revenue_impact + formula_retention_savings) - yearly_tool_cost - yearly_monitoring_support_cost - yearly_ai_staff_cost) / (((avg_yearly_cost_per_employee / avg_yearly_cost_per_employee) + discount_rate) * ((avg_yearly_cost_per_employee / avg_yearly_cost_per_employee) + discount_rate) * ((avg_yearly_cost_per_employee / avg_yearly_cost_per_employee) + discount_rate)))',
        array[
          uuid_generate_v5(metric_namespace, 'first_year_change_management_cost'),
          uuid_generate_v5(metric_namespace, 'yearly_tool_cost'),
          uuid_generate_v5(metric_namespace, 'yearly_monitoring_support_cost'),
          uuid_generate_v5(metric_namespace, 'yearly_ai_staff_cost'),
          uuid_generate_v5(metric_namespace, 'avg_yearly_cost_per_employee'),
          uuid_generate_v5(metric_namespace, 'discount_rate')
        ]::uuid[],
        array[
          uuid_generate_v5(formula_namespace, 'formula_time_savings_total'),
          uuid_generate_v5(formula_namespace, 'formula_quality_savings'),
          uuid_generate_v5(formula_namespace, 'formula_product_revenue_impact'),
          uuid_generate_v5(formula_namespace, 'formula_retention_savings')
        ]::uuid[]
      )
    ) as formula(slug, name, category_slug, expression, dependent_metric_ids, dependent_formula_ids)
  )
  insert into public.notebook_formulas (
    id,
    notebook_id,
    category_id,
    name,
    expression,
    ast,
    dependent_metrics,
    dependent_formulas,
    version,
    create_user_id,
    last_updated_user_id
  )
  select
    uuid_generate_v5(formula_namespace, slug),
    notebook_id,
    uuid_generate_v5(category_namespace, category_slug),
    name,
    expression,
    null,
    dependent_metric_ids,
    dependent_formula_ids,
    1,
    owner_user_id,
    owner_user_id
  from formula_source
  on conflict (id) do update
  set
    category_id = excluded.category_id,
    name = excluded.name,
    expression = excluded.expression,
    dependent_metrics = excluded.dependent_metrics,
    dependent_formulas = excluded.dependent_formulas,
    version = excluded.version,
    last_updated_user_id = excluded.last_updated_user_id,
    updated_at = now();

  update public.notebook_categories
  set total_formula_id = uuid_generate_v5(formula_namespace, 'formula_time_savings_total')
  where id = uuid_generate_v5(category_namespace, 'cat-time-savings');

  update public.notebook_categories
  set total_formula_id = uuid_generate_v5(formula_namespace, 'formula_quality_savings')
  where id = uuid_generate_v5(category_namespace, 'cat-quality');

  update public.notebook_categories
  set total_formula_id = uuid_generate_v5(formula_namespace, 'formula_product_revenue_impact')
  where id = uuid_generate_v5(category_namespace, 'cat-product-delivery');

  update public.notebook_categories
  set total_formula_id = uuid_generate_v5(formula_namespace, 'formula_retention_savings')
  where id = uuid_generate_v5(category_namespace, 'cat-retention');

  update public.notebook_categories
  set total_formula_id = uuid_generate_v5(formula_namespace, 'formula_ongoing_costs')
  where id = uuid_generate_v5(category_namespace, 'cat-costs');

  insert into public.simulations (
    id,
    notebook_id,
    branch_id,
    started_by,
    status,
    started_ts,
    finished_ts,
    iterations,
    engine_version,
    input_hash,
    input_snapshot,
    results,
    summary,
    error
  )
  values (
    simulation_id,
    notebook_id,
    null,
    owner_user_id,
    'succeeded',
    now() - interval '5 minutes',
    now() - interval '4 minutes',
    100000,
    'mock-1.0',
    'mock-data:v1',
    jsonb_build_object(
      'notebookId', notebook_id,
      'source', 'lib/mock-data.ts'
    ),
    jsonb_build_object(
      'npv', jsonb_build_object(
        'p10', 1200000,
        'p25', 1500000,
        'p50', 1850000,
        'p75', 2100000,
        'p90', 2400000,
        'mean', 1850000,
        'std', 450000
      ),
      'paybackPeriod', jsonb_build_object('p50', 4.2),
      'yearlyResults', jsonb_build_array(
        jsonb_build_object(
          'year', 1,
          'benefits', jsonb_build_object('p10', 800000, 'p25', 950000, 'p50', 1100000, 'p75', 1250000, 'p90', 1400000, 'mean', 1100000),
          'costs', jsonb_build_object('p10', 380000, 'p25', 420000, 'p50', 460000, 'p75', 500000, 'p90', 540000, 'mean', 460000),
          'net', jsonb_build_object('p10', 320000, 'p25', 480000, 'p50', 640000, 'p75', 780000, 'p90', 920000, 'mean', 640000)
        ),
        jsonb_build_object(
          'year', 2,
          'benefits', jsonb_build_object('p10', 850000, 'p25', 1000000, 'p50', 1150000, 'p75', 1300000, 'p90', 1450000, 'mean', 1150000),
          'costs', jsonb_build_object('p10', 340000, 'p25', 380000, 'p50', 420000, 'p75', 460000, 'p90', 500000, 'mean', 420000),
          'net', jsonb_build_object('p10', 400000, 'p25', 560000, 'p50', 730000, 'p75', 880000, 'p90', 1020000, 'mean', 730000)
        ),
        jsonb_build_object(
          'year', 3,
          'benefits', jsonb_build_object('p10', 900000, 'p25', 1050000, 'p50', 1200000, 'p75', 1350000, 'p90', 1500000, 'mean', 1200000),
          'costs', jsonb_build_object('p10', 340000, 'p25', 380000, 'p50', 420000, 'p75', 460000, 'p90', 500000, 'mean', 420000),
          'net', jsonb_build_object('p10', 450000, 'p25', 610000, 'p50', 780000, 'p75', 930000, 'p90', 1070000, 'mean', 780000)
        )
      ),
      'categoryContributions', jsonb_build_array(
        jsonb_build_object('categoryId', 'cat-time-savings', 'categoryName', 'Time Savings Benefits', 'contribution', 920000, 'percentage', 48.5),
        jsonb_build_object('categoryId', 'cat-quality', 'categoryName', 'Quality Improvement Benefits', 'contribution', 380000, 'percentage', 20.0),
        jsonb_build_object('categoryId', 'cat-product-delivery', 'categoryName', 'Product Delivery Benefits', 'contribution', 450000, 'percentage', 23.7),
        jsonb_build_object('categoryId', 'cat-retention', 'categoryName', 'Employee Retention Benefits', 'contribution', 150000, 'percentage', 7.9),
        jsonb_build_object('categoryId', 'cat-costs', 'categoryName', 'AI Implementation Costs', 'contribution', -520000, 'percentage', -27.4)
      ),
      'sensitivityAnalysis', jsonb_build_array(
        jsonb_build_object('metricId', 'weekly_hours_saved_per_employee', 'metricName', 'Weekly Hours Saved per Employee', 'impact', 0.65),
        jsonb_build_object('metricId', 'productivity_conversion_rate', 'metricName', 'Productivity Conversion Rate', 'impact', 0.42),
        jsonb_build_object('metricId', 'feature_delivery_rate', 'metricName', 'Feature Delivery Rate', 'impact', 0.38),
        jsonb_build_object('metricId', 'new_customers_per_year', 'metricName', 'New Customers per Year', 'impact', 0.35),
        jsonb_build_object('metricId', 'bug_reduction_rate', 'metricName', 'Bug Reduction Rate', 'impact', 0.28),
        jsonb_build_object('metricId', 'yearly_tool_cost', 'metricName', 'Yearly Tool Cost', 'impact', -0.25),
        jsonb_build_object('metricId', 'retention_improvement_rate', 'metricName', 'Retention Improvement Rate', 'impact', 0.18)
      ),
      'metadata', jsonb_build_object(
        'calculationTimeMs', 8500,
        'iterations', 100000,
        'timestamp', now()
      )
    ),
    jsonb_build_object(
      'notes', 'Seeded from lib/mock-data.ts',
      'highlights', jsonb_build_array(
        'P50 NPV ≈ $1.85M',
        'Median payback ≈ 4.2 months'
      )
    ),
    null
  )
  on conflict (id) do update
  set
    notebook_id = excluded.notebook_id,
    started_by = excluded.started_by,
    status = excluded.status,
    started_ts = excluded.started_ts,
    finished_ts = excluded.finished_ts,
    iterations = excluded.iterations,
    engine_version = excluded.engine_version,
    input_hash = excluded.input_hash,
    input_snapshot = excluded.input_snapshot,
    results = excluded.results,
    summary = excluded.summary,
    error = excluded.error;

  update public.notebooks
  set
    last_simulation_id = simulation_id,
    updated_at = now()
  where id = notebook_id;
end
$$ language plpgsql;

commit;

\echo '✅ Mock data load complete.'
