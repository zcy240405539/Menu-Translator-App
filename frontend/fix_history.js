const fs = require('fs');
let content = fs.readFileSync('screens/HistoryScreen.js', 'utf8');
content = content.replace(/IconButton,\s+\} from "react-native-paper";/, 'IconButton,\n  useTheme,\n} from "react-native-paper";');
fs.writeFileSync('screens/HistoryScreen.js', content);
