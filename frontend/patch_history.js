const fs = require('fs');
let f = fs.readFileSync('screens/HistoryScreen.js', 'utf8');

const header = `<Appbar.Header style={{ backgroundColor: theme.colors.background }}>
  <Appbar.BackAction onPress={onBack || onGoHome} />
  <Appbar.Content title={t.history.title} />
  <Appbar.Action icon="delete-outline" accessibilityLabel={t.history.clear} onPress={async () => { await clearMenuHistory(); setHistory([]); }} />
</Appbar.Header>`;

f = f.replace('<FlatList', header + '\n      <FlatList');
f = f.replace(/ListHeaderComponent=\{\([\s\S]*?\)\}/, '');
fs.writeFileSync('screens/HistoryScreen.js', f);
