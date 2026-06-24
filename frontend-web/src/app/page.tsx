import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Globe, Upload, ChevronDown, Utensils, Smartphone, CheckCircle, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const menuHash = resolvedParams.menu_hash as string;
  const lang = (resolvedParams.lang as string) || "zh";

  if (menuHash) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/menus/cache/${menuHash}?target_lang=${lang}`);
      if (res.ok) {
        const data = await res.json();
        const businessName = data.business_name || 'Restaurant';
        return {
          title: `${businessName} Menu - Translated by AnyMenu`,
          description: `View the menu for ${businessName} translated to your language.`,
          openGraph: {
            title: `${businessName} Menu - Translated by AnyMenu`,
            description: `View the menu for ${businessName} translated to your language.`,
            images: [
              {
                url: '/images/anymenu-logo.svg', // Fallback OG image
                width: 800,
                height: 600,
              },
            ],
          }
        };
      }
    } catch (e) {
      console.error("Error generating metadata:", e);
    }
  }

  return {
    title: "AnyMenu - Translate Menus & Order with Ease",
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const menuHash = resolvedParams.menu_hash as string;
  const lang = (resolvedParams.lang as string) || "zh";

  let menuData = null;
  if (menuHash) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/menus/cache/${menuHash}?target_lang=${lang}`, { cache: "no-store" });
      if (res.ok) {
        menuData = await res.json();
      }
    } catch (e) {
      console.error("Error fetching menu data:", e);
    }
  }

  return (
    <div className="flex min-h-screen flex-col font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm relative">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-xl text-emerald-800">AnyMenu</span>
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/#features" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">Features</Link>
            <Link href="/#how-it-works" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">How It Works</Link>
            <Link href="/#languages" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">Languages</Link>
            <Button className="bg-black text-white rounded-lg hover:bg-gray-800 flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Download App
            </Button>
            <div className="flex items-center gap-1 border rounded-md px-3 py-1.5 text-sm font-medium hover:bg-gray-50 cursor-pointer">
              <Globe className="h-4 w-4 text-gray-600" />
              <span>English</span>
              <ChevronDown className="h-3 w-3 text-gray-500" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {menuData ? (
          /* SHARED MENU RESULT VIEW */
          <section className="w-full py-12 bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 max-w-4xl">
              <Link href="/" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-6">
                <ArrowLeft className="h-4 w-4" /> Back to Home
              </Link>
              <Card className="shadow-lg border-emerald-100">
                <CardHeader className="border-b bg-emerald-50/50 rounded-t-xl">
                  <CardTitle className="text-2xl text-emerald-950 flex justify-between items-center">
                    <span>{menuData.business_name || 'Restaurant Menu'}</span>
                    <span className="text-sm font-normal text-emerald-700 px-3 py-1 bg-emerald-200/50 rounded-full">
                      Target: {lang.toUpperCase()}
                    </span>
                  </CardTitle>
                  {menuData.restaurant_type && (
                    <p className="text-emerald-700">{menuData.restaurant_type}</p>
                  )}
                </CardHeader>
                <CardContent className="p-6">
                  {menuData.sections && menuData.sections.length > 0 ? (
                    <div className="space-y-8">
                      {menuData.sections.map((section: any, idx: number) => (
                        <div key={idx} className="space-y-4">
                          <h3 className="text-xl font-bold text-gray-800 border-b pb-2">{section.category_name}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {section.items?.map((item: any, i: number) => (
                              <Card key={i} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex flex-col justify-between h-full">
                                  <div>
                                    <h4 className="font-bold text-lg text-gray-900">{item.name}</h4>
                                    {item.original_name && <p className="text-sm text-gray-500 mb-2">{item.original_name}</p>}
                                    <p className="text-sm text-gray-700 mb-3 line-clamp-3">{item.description}</p>
                                  </div>
                                  <div className="font-semibold text-emerald-700 mt-auto">
                                    {item.price} {menuData.currency}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-12">No menu items found.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        ) : (
          /* DEFAULT LANDING PAGE HERO */
          <section className="w-full py-16 md:py-24 bg-emerald-50/50">
            <div className="container mx-auto px-4">
              <div className="flex flex-col items-center text-center space-y-8">
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-emerald-950">
                    Translate Menus, Order with Ease
                  </h1>
                  <p className="max-w-[650px] mx-auto text-gray-600 text-lg md:text-xl">
                    Lost in translation at a restaurant? Instantly translate menus in 50+ languages and build your order. Understand every dish and dine like a local.
                  </p>
                </div>

                <Card className="max-w-2xl mx-auto w-full border-emerald-100 shadow-lg rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-2xl text-emerald-950">Start Translating</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2 text-left">
                      <label className="text-sm font-medium text-gray-700">Translate menu to:</label>
                      <Select defaultValue="en">
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="zh-cn">简体中文 (Simplified Chinese)</SelectItem>
                          <SelectItem value="zh-tw">繁體中文 (Traditional Chinese)</SelectItem>
                          <SelectItem value="es">Español (Spanish)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative p-6 border-2 border-dashed border-emerald-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors group">
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                        <Upload className="h-8 w-8 text-emerald-600 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="font-medium text-emerald-900">Upload Menu Image</span>
                        <p className="text-xs text-gray-500 mt-1">Tap or click to browse</p>
                      </div>
                      <div className="relative p-6 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center opacity-50 cursor-not-allowed">
                         <Search className="h-8 w-8 text-gray-400 mb-3" />
                         <span className="font-medium text-gray-600">Scan via App</span>
                         <p className="text-xs text-gray-400 mt-1">Download app to scan live</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 text-center">
                      Upload a photo or PDF of a menu to translate it instantly.
                    </p>
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-3 justify-center pt-4">
                  <span className="bg-white border text-emerald-900 px-5 py-2 rounded-full text-sm font-medium shadow-sm">50+ Languages</span>
                  <span className="bg-white border text-emerald-900 px-5 py-2 rounded-full text-sm font-medium shadow-sm">Instant Translation</span>
                  <span className="bg-white border text-emerald-900 px-5 py-2 rounded-full text-sm font-medium shadow-sm">Free to Use</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FEATURES */}
        <section id="features" className="w-full py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">Key Features for Easy Dining</h2>
              <p className="max-w-[700px] mx-auto text-gray-600 text-lg">Your smart AI menu translator helps you understand local dishes anywhere in the world.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Globe, title: "Translate 50+ Languages", desc: "Instant translations from and to over 50 languages, including rare dialects.", color: "text-blue-600", bg: "bg-blue-100" },
                { icon: Utensils, title: "Detailed Descriptions", desc: "Get clear explanations of unfamiliar dishes, ingredients, and cooking styles.", color: "text-emerald-600", bg: "bg-emerald-100" },
                { icon: CheckCircle, title: "Order with Ease", desc: "Build a clear list of chosen dishes to show the waiter and ensure accurate orders.", color: "text-amber-600", bg: "bg-amber-100" },
                { icon: Smartphone, title: "All Menu Types", desc: "Digital, printed, handwritten. Our OCR technology handles them all.", color: "text-purple-600", bg: "bg-purple-100" },
              ].map((f, i) => (
                <Card key={i} className="border-0 shadow-md">
                  <CardHeader className="text-center items-center pb-2">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${f.bg}`}>
                      <f.icon className={`h-7 w-7 ${f.color}`} />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="w-full py-20 bg-emerald-900 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">How It Works: Snap, Translate, Order!</h2>
            <p className="max-w-[700px] mx-auto text-emerald-100 text-lg mb-16">Three simple steps to decode any menu.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-2xl font-bold mb-6">1</div>
                <h3 className="text-xl font-bold mb-3">Snap or Upload</h3>
                <p className="text-emerald-100">Take a clear photo or upload an image file of the menu.</p>
              </div>
              <div className="flex flex-col items-center relative">
                <div className="hidden md:block absolute top-8 left-[-50%] w-full h-[2px] bg-emerald-700 -z-10"></div>
                <div className="w-16 h-16 rounded-full bg-emerald-400 flex items-center justify-center text-2xl font-bold mb-6">2</div>
                <h3 className="text-xl font-bold mb-3">Get Translation</h3>
                <p className="text-emerald-100">Our AI instantly processes the image to give you native-language descriptions.</p>
              </div>
              <div className="flex flex-col items-center relative">
                <div className="hidden md:block absolute top-8 left-[-50%] w-full h-[2px] bg-emerald-700 -z-10"></div>
                <div className="w-16 h-16 rounded-full bg-emerald-300 text-emerald-950 flex items-center justify-center text-2xl font-bold mb-6">3</div>
                <h3 className="text-xl font-bold mb-3">Order Freely</h3>
                <p className="text-emerald-100">Pick your dishes, show the list to your waiter, and enjoy your meal!</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="w-full py-20 bg-gray-50">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">Frequently Asked Questions</h2>
            </div>
            <Accordion className="w-full bg-white rounded-xl shadow-sm border p-4">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left font-semibold text-gray-800">Does the menu translator work offline?</AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Currently, the translation requires an active internet connection to process the images through our advanced AI models.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left font-semibold text-gray-800">Can I rely on this for food allergies?</AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  While our AI provides highly accurate ingredient analyses, always double-check with restaurant staff if you have severe allergies.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left font-semibold text-gray-800">Is it free to use?</AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Yes, the basic web translation features are free to use, supported by ads. The mobile app offers additional premium features.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t py-8 bg-gray-950 text-gray-400">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-lg">AnyMenu</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} AnyMenu. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="text-sm hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-sm hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
