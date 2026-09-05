const fs = require('fs');
let f = fs.readFileSync('screens/MenuResultScreen.js', 'utf8');

// Add Appbar to imports
f = f.replace('Surface,', 'Surface,\n  Appbar,');

const header = `<Appbar.Header style={{ backgroundColor: theme.colors.background }}>
  <Appbar.BackAction onPress={onBack} />
  <Appbar.Content title={parsedResult?.business_name || t.result.title} />
</Appbar.Header>`;

f = f.replace('<ScrollView contentContainerStyle={styles.listContent}>', header + '\n      <ScrollView contentContainerStyle={styles.listContent}>');
fs.writeFileSync('screens/MenuResultScreen.js', f);
