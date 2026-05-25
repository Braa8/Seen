import Navbar from "@/components/Navbar";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black text-sky-600 mb-4">سين</h1>
          <p className="text-2xl text-slate-600 font-light">لأن الصحافة سؤال</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6 text-slate-700 leading-relaxed">
          <p>
            سين منصة صحفية عربية تؤمن بأن الصحافة الحقيقية تبدأ بسؤال، وتنتهي بحقيقة.
            نحن نجمع الكتّاب والمحررين والقراء في فضاء واحد، بعيداً عن الضجيج وقريباً من المعنى.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {[
              { title: "للقراء", desc: "محتوى محكّم ومتنوع يغطي مختلف الاهتمامات" },
              { title: "للكتّاب", desc: "منصة احترافية لنشر مقالاتك والوصول لجمهور أوسع" },
              { title: "للمحررين", desc: "أدوات متكاملة لمراجعة المحتوى وضمان جودته" },
              { title: "للمجتمع", desc: "فضاء نقاش راقٍ يحترم العقول ويصون الحقيقة" },
            ].map((item) => (
              <div key={item.title} className="bg-slate-50 rounded-xl p-5">
                <h3 className="font-bold text-sky-700 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
