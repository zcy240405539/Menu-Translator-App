const fs = require('fs');
let f = fs.readFileSync('components/OnboardingModal.js', 'utf8');

const touchLogic = `  const finish = () => {
    setStep(0);
    onComplete();
  };

  const [touchStart, setTouchStart] = useState(null);
  const onTouchStart = (e) => setTouchStart(e.nativeEvent.pageX);
  const onTouchEnd = (e) => {
    if (!touchStart) return;
    const distance = touchStart - e.nativeEvent.pageX;
    if (distance > 50 && !isLast) setStep(s => s + 1);
    if (distance < -50 && step > 0) setStep(s => s - 1);
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={finish}>
      <Surface 
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <View style={styles.topRow}>`;

f = f.replace(/  const finish = \(\) => {[\s\S]*?<View style=\{styles\.topRow\}>/, touchLogic);
fs.writeFileSync('components/OnboardingModal.js', f);
