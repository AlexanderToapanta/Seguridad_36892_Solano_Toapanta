#!/bin/sh
set -eu

SQL_DIR="/db-scripts"

run_sql() {
  script_name="$1"
  script_path="$SQL_DIR/$script_name"

  if [ ! -f "$script_path" ]; then
    echo "Skipping missing SQL script: $script_name"
    return 0
  fi

  echo "Running SQL script: $script_name"
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$script_path"
}

run_sql "init.sql"
run_sql "migration_add_telefono_usuario.sql"
run_sql "migration_add_profile_images.sql"
run_sql "migration_add_atleta_personal_info.sql"
run_sql "migration_add_membership_dates.sql"
run_sql "fix_atleta_columns.sql"
run_sql "migration_create_ejercicios_table.sql"
run_sql "seed_ejercicios_crossfit.sql"
run_sql "migration_create_progreso_atleta.sql"
run_sql "migration_create_wod_table.sql"
run_sql "migration_fix_inscripciones.sql"
run_sql "migration_add_asistencia_racha.sql"
run_sql "seed_wod_schedules.sql"