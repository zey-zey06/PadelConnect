const config = {
  no_show_amount: 2000,
  late_cancel_amount: 5000,
};

function getConfig() {
  return { ...config };
}

function updateConfig(updates) {
  if (updates.no_show_amount != null) config.no_show_amount = updates.no_show_amount;
  if (updates.late_cancel_amount != null) config.late_cancel_amount = updates.late_cancel_amount;
  return getConfig();
}

module.exports = { getConfig, updateConfig };
