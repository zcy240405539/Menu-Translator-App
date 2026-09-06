const fs = require('fs');
let content = fs.readFileSync('screens/HomeScreen.js', 'utf8');

const arrayMatch = content.match(/const homeFeatureItems = \[[\s\S]*?\];/);
if (arrayMatch) {
  content = content.replace(arrayMatch[0], `const homeFeatureItems = [
      { title: t.home.featureDocuments, color: '#EA4335' }, // Red
      { title: t.home.featureTranslation, color: '#333333' }, // Dark
      { title: t.home.featureOrderList, color: '#9E9E9E' }, // Grey
      { title: t.home.featureAiRecommend, color: '#FBBC05' }, // Yellow
    ];`);
}

content = content.replace(
  /\{homeFeatureItems\.map\(\(item, index\) => \([\s\S]*?<\/View>\s*\)\)\}/,
  `{homeFeatureItems.map((item, index) => (
                  <View key={item.title} style={[
                    styles.featureTextCard,
                    isDesktopLayout && styles.featureTextCardDesktop,
                    { borderTopColor: item.color }
                  ]}>
                    <Text style={[styles.featureNumber, { color: item.color }]}>
                      {String(index + 1).padStart(2, "0")}
                    </Text>
                    <Text style={[styles.featureText, { color: theme.colors.onSurface }]}>
                      {item.title}
                    </Text>
                  </View>
                ))}`
);

content = content.replace(
  /featurePill: \{[\s\S]*?\},/,
  `featureTextCard: {
      width: "48%",
      minWidth: 140,
      flexGrow: 1,
      borderTopWidth: 4,
      backgroundColor: "transparent",
      paddingHorizontal: 8,
      paddingVertical: 16,
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 4,
    },`
);

content = content.replace(
  /featurePillDesktop: \{[\s\S]*?\},/,
  `featureTextCardDesktop: {
      width: "23%",
      maxWidth: "23%",
      minWidth: 160,
    },`
);

content = content.replace(
  /featureNumber: \{[\s\S]*?\},/,
  `featureNumber: {
      fontSize: 18,
      fontWeight: "800",
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },`
);

content = content.replace(
  /featureText: \{[\s\S]*?\},/,
  `featureText: {
      fontSize: 18,
      fontWeight: "700",
      lineHeight: 24,
      marginTop: 4,
    },`
);

fs.writeFileSync('screens/HomeScreen.js', content);
