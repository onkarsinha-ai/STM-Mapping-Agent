export interface Connection {
  id: string
  name: string
  connection_type: 'source' | 'target' | 'jira' | 'llm'
  db_type: string | null
  is_tested: boolean
}

export interface Project {
  id: string
  name: string
  description: string | null
  status: string
  current_phase: string
  source_connection_id: string | null
  target_connection_id: string | null
}

export interface Mapping {
  id: string
  target_table: string
  target_column: string
  source_table: string | null
  source_column: string | null
  business_logic: string | null
  transformation_rule: string | null
  confidence_score: number | null
  status: string
  llm_reasoning: string | null
}

export interface SchemaTree {
  [schema: string]: {
    [table: string]: Array<{
      name: string
      type: string
      nullable: boolean
    }>
  }
}
