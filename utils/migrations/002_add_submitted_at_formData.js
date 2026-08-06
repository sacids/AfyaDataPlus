export default {
  id: "002_add_submitted_at_formData",
  description: "Add submitted_at column to form_data",
  
  up: [
    `ALTER TABLE form_data ADD COLUMN submitted_at TEXT;`,
    // optional data backfill
    `UPDATE form_data SET submitted_at = created_on WHERE submitted_at IS NULL;`
  ],
  down: [
    `ALTER TABLE form_data DROP COLUMN submitted_at;`
  ]
};