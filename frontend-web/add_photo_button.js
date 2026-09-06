const fs = require('fs');
let content = fs.readFileSync('src/components/MenuAnalyzer.tsx', 'utf8');

const newButton = `<input
            type="file"
            accept="image/*"
            className="hidden"
            ref={galleryInputRef}
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            className="h-14 w-full rounded-xl border-0 bg-purple-100 text-base font-medium text-purple-800 transition-colors hover:bg-purple-200"
            onClick={() => galleryInputRef.current?.click()}
          >
            <Image className="mr-2 h-5 w-5" />
            {selectedFile?.type.startsWith("image/") ? text.changePicture : (text.selectFromGallery || "Photo Library")}
          </Button>

          <input`;

content = content.replace(/<input\s+type="file"\s+accept="image\/\*"\s+capture="environment"/, newButton + '\n            type="file"\n            accept="image/*"\n            capture="environment"');

content = content.replace(/const cameraInputRef = useRef<HTMLInputElement>\(null\);/, `const cameraInputRef = useRef<HTMLInputElement>(null);\n  const galleryInputRef = useRef<HTMLInputElement>(null);`);

content = content.replace(/import { Camera, FileUp, /, 'import { Camera, FileUp, Image, ');

fs.writeFileSync('src/components/MenuAnalyzer.tsx', content);
