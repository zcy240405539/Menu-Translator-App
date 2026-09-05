const fs = require('fs');

// Patch LegalDocumentModal.js
let f = fs.readFileSync('components/LegalDocumentModal.js', 'utf8');
f = f.replace(/<Modal visible=\{visible\} animationType="slide" onRequestClose=\{onClose\}>/g, '');
f = f.replace(/<\/Modal>/g, '');
f = f.replace('<Surface style={[styles.screen, { backgroundColor: theme.colors.background }]}', '<Surface style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background, zIndex: 100 }]}');
f = f.replace('if (!document) return null;', 'if (!visible || !document) return null;');
fs.writeFileSync('components/LegalDocumentModal.js', f);

// Patch SettingsModal.js
f = fs.readFileSync('components/SettingsModal.js', 'utf8');
f = f.replace('<LegalDocumentModal\n        visible={Boolean(legalKind)}\n        kind={legalKind}\n        targetLang={targetLang}\n        onClose={() => setLegalKind(null)}\n      />', '');
f = f.replace('</Modal>', '  <LegalDocumentModal\n        visible={Boolean(legalKind)}\n        kind={legalKind}\n        targetLang={targetLang}\n        onClose={() => setLegalKind(null)}\n      />\n      </Modal>');
fs.writeFileSync('components/SettingsModal.js', f);
