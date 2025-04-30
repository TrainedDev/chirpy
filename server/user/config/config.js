require('dotenv').config();

module.exports = {
  development: {
    use_env_variable: "SUPABASE_URL",
    dialect: 'postgres'
  },
  production: {
    use_env_variable: "SUPABASE_URL",
    dialect: 'postgres'
  }
};
