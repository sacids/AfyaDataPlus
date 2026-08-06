import migration001 from "./001_initial_schema";
import migration002 from "./002_add_submitted_at_formData"; // add new ones here

export const migrations = [
    migration001,
    migration002,
    // migration003,
];