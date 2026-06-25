import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Globe, Utensils, Smartphone, CheckCircle, ArrowLeft, Share2, History, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";
import MenuAnalyzer from "@/components/MenuAnalyzer";

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
          title: `${businessName} Menu - Translated by AI Menu`,
          description: `View the menu for ${businessName} translated to your language.`,
          openGraph: {
            title: `${businessName} Menu - Translated by AI Menu`,
            description: `View the menu for ${businessName} translated to your language.`,
          }
        };
      }
    } catch (e) {
      console.error("Error generating metadata:", e);
    }
  }

  return {
    title: "AI Menu - Translate Menus & Order with Ease",
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
    <div className="flex min-h-screen flex-col font-sans bg-gray-50/30">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 flex-1 justify-center md:justify-start">
            <span className="font-medium text-xl text-gray-800">AI Menu</span>
          </Link>
          <div className="hidden md:flex items-center space-x-6 text-gray-700">
            <Link href="#" className="hover:text-purple-600 transition-colors"><Share2 className="w-5 h-5" /></Link>
            <Link href="#" className="hover:text-purple-600 transition-colors"><History className="w-5 h-5" /></Link>
            <Link href="#" className="hover:text-purple-600 transition-colors"><ShoppingCart className="w-5 h-5" /></Link>
            <Link href="#" className="hover:text-purple-600 transition-colors"><User className="w-5 h-5" /></Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {menuData ? (
          /* SHARED MENU RESULT VIEW */
          <section className="w-full py-12 bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 max-w-4xl">
              <Link href="/" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mb-6">
                <ArrowLeft className="h-4 w-4" /> Back to Home
              </Link>
              <Card className="shadow-lg border-purple-100">
                <CardHeader className="border-b bg-purple-50/50 rounded-t-xl">
                  <CardTitle className="text-2xl text-purple-950 flex justify-between items-center">
                    <span>{menuData.business_name || 'Restaurant Menu'}</span>
                    <span className="text-sm font-normal text-purple-700 px-3 py-1 bg-purple-200/50 rounded-full">
                      Target: {lang.toUpperCase()}
                    </span>
                  </CardTitle>
                  {menuData.restaurant_type && (
                    <p className="text-purple-700">{menuData.restaurant_type}</p>
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
                                  <div className="font-semibold text-purple-700 mt-auto">
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
          <section className="w-full py-16 md:py-24">
            <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                {/* Left Content */}
                <div className="space-y-10">
                  <div className="space-y-6">
                    <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] leading-tight font-extrabold tracking-tight text-[#6b21a8]">
                      Translate menus,<br/>order with ease
                    </h1>
                    <p className="text-gray-600 text-lg md:text-xl max-w-lg leading-relaxed">
                      Upload photos, PDFs, websites, or delivery app links to get clear dish names, descriptions, and ingredients.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div className="bg-white border border-gray-100 shadow-sm rounded-xl py-3 px-4 flex items-center gap-3">
                      <span className="text-purple-700 font-bold">01</span>
                      <span className="text-gray-800 font-medium text-sm">Photos/PDF/Web</span>
                    </div>
                    <div className="bg-white border border-gray-100 shadow-sm rounded-xl py-3 px-4 flex items-center gap-3">
                      <span className="text-purple-700 font-bold">02</span>
                      <span className="text-gray-800 font-medium text-sm">AI Translation</span>
                    </div>
                    <div className="bg-white border border-gray-100 shadow-sm rounded-xl py-3 px-4 flex items-center gap-3">
                      <span className="text-purple-700 font-bold">03</span>
                      <span className="text-gray-800 font-medium text-sm">Order Sync</span>
                    </div>
                    <div className="bg-white border border-gray-100 shadow-sm rounded-xl py-3 px-4 flex items-center gap-3">
                      <span className="text-purple-700 font-bold">04</span>
                      <span className="text-gray-800 font-medium text-sm">AI Suggestion</span>
                    </div>
                  </div>
                </div>

                {/* Right Content - Form */}
                <div className="w-full max-w-md mx-auto lg:ml-auto">
                  <MenuAnalyzer />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FEATURES (Hidden or kept? Kept but updated theme) */}
        {!menuData && (
          <section id="features" className="w-full py-20 bg-white border-t border-gray-100">
            <div className="container mx-auto px-4 max-w-6xl">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">Key Features</h2>
                <p className="max-w-[700px] mx-auto text-gray-600 text-lg">Your smart AI menu translator helps you understand local dishes anywhere in the world.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: Globe, title: "Translate 50+ Languages", desc: "Instant translations from and to over 50 languages.", color: "text-blue-600", bg: "bg-blue-100" },
                  { icon: Utensils, title: "Detailed Descriptions", desc: "Get clear explanations of unfamiliar dishes and ingredients.", color: "text-purple-600", bg: "bg-purple-100" },
                  { icon: CheckCircle, title: "Order with Ease", desc: "Build a clear list of chosen dishes to show the waiter.", color: "text-amber-600", bg: "bg-amber-100" },
                  { icon: Smartphone, title: "All Menu Types", desc: "Digital, printed, handwritten. Our OCR handles them all.", color: "text-pink-600", bg: "bg-pink-100" },
                ].map((f, i) => (
                  <Card key={i} className="border-0 shadow-sm bg-gray-50/50">
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
        )}
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t py-8 bg-gray-50 text-gray-500">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 max-w-6xl">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700 text-lg">AI Menu</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} AI Menu. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="text-sm hover:text-purple-600 transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-sm hover:text-purple-600 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
