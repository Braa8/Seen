"use client";
import TextType from '../../components/TextType';
import React from "react";
import SplitRevealItem from "../../components/SplitRevealItem";
import RotatingText from '../../components/RotatingText';
import Writing from '@/components/Writing';
import Search from '@/components/Search';
import Lamp from '@/components/Lamp';
import Question from '@/components/Question';
import Link from 'next/link';

const sections = [
  {
    id: "1",
    reverse: false,
    content: (
      <div className="flex flex-col md:flex-row p-6 gap-8 items-center">
        <div className="md:basis-2/3 flex flex-col justify-center items-start text-gray-300 space-y-6">
          <TextType
            text={[" نكتب السياسة و المجتمع بعيون مفتوحة على النقد و الوعي ، و بمسؤولية تجاه الإنسان"]}
            typingSpeed={75}
            pauseDuration={1500}
            showCursor={true}
            cursorCharacter="✒️"
            className="text-gray-300 text-xl md:text-2xl leading-relaxed"
          />
          <p className="text-sm md:text-base text-gray-400">
            نعتمد على الإبداع والتقنية لتقديم حكاية واضحة، ونعكس القيم الإنسانية في كل مادة ننشرها.
          </p>
        </div>

        <div className="md:basis-1/3 hover:cursor-grab flex justify-center items-center w-full p-2 ">
          <Writing modelPath="/writing.glb" />
        </div>
      </div>
    )
  },
  {
    id: "2",
    reverse: true,
    content: (
      <div className="flex flex-col md:flex-row p-6 gap-8 items-center">
        <div className="md:basis-2/3 flex flex-col justify-center items-start text-gray-200 space-y-6">
            <TextType
            text={[" لا نكتفي بنقل الخبر ، بل نبحث بعمق في التفاصيل التي تغيّبها العناوين السريعة"]}
            typingSpeed={75}
            pauseDuration={1500}
            showCursor={true}
            cursorCharacter="✒️"
            className="text-gray-300 text-xl md:text-2xl leading-relaxed"
          />
        </div>

        <div className="md:basis-1/3 hover:cursor-grab flex justify-center items-center w-full ">
          <Search modelPath='search.glb' />
        </div>

      </div>
    )
  },
  {
    id: "3",
    reverse: false,
    content: (
      <div className="flex flex-col md:flex-row p-6 gap-8 items-center">
        <div className="md:basis-2/3 flex flex-col justify-center items-start text-gray-300 space-y-6">
           <TextType
            text={[" نؤمن بأن الصحافة ليست حياداً جافّاً ، بل التزام بالحقيقة و حق القارئ في الفهم ، لأن كل حكاية تبدأ بسؤال"]}
            typingSpeed={75}
            pauseDuration={1500}
            showCursor={true}
            cursorCharacter="✒️"
            className="text-gray-300 text-xl md:text-2xl leading-relaxed"
          />
        </div>

        <div className="md:basis-1/3 hover:cursor-grab flex justify-center items-center w-full ">
          <Lamp modelPath='/book.glb' />
        </div>

      </div>
    )
  },
  {
    id: "4",
    reverse: true,
    content: (
      <div className="flex flex-col md:flex-row p-6 gap-8 items-center">
        <div className="md:basis-2/3 flex flex-col justify-center items-start text-gray-300 space-y-6">
            <TextType
            text={[" هنا نُبدي اهتماماً بالأسئلة المهمّشة ، و نُسلّط الضوء على القضايا التي تؤثّر في حياتنا اليومية"]}
            typingSpeed={75}
            pauseDuration={1500}
            showCursor={true}
            cursorCharacter="✒️"
            className="text-gray-300 text-xl md:text-2xl leading-relaxed"
          />
        </div>

        <div className="md:basis-1/3 hover:cursor-grab flex justify-center items-center w-full ">
            <Question modelPath='question_mark.glb' />
        </div>

      </div>
    )
  }
];

const About = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-14">

        <div className='flex justify-center items-center m-4 border-2 border-gray-400 p-4 rounded-full'>
          <h1 className='font-bold mx-2 text-2xl'>سين جريدة</h1>
            <RotatingText
                texts={['مستقلة','موضوعية','مُبتَكرة','متنوّعة','حرّة']}
                mainClassName="px-2 text-2xl sm:px-2 md:px-3 bg-cyan-300 text-black overflow-hidden py-0.5 sm:py-1 md:py-2 justify-center rounded-lg"
                staggerFrom={"last"}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-120%" }}
                staggerDuration={0.025}
                splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                rotationInterval={2000}
              />
        </div>
        

        <div className="flex flex-col divide-y ">
          {sections.map(({ id, reverse, content }) => (
            <div key={id} className="py-12">
              <SplitRevealItem id={id} reverse={reverse}>
                {content}
              </SplitRevealItem>
            </div>
          ))}
        </div>

        <div className='flex flex-col p-4 mt-4'>
          <Link href="/" className='self-center bg-cyan-400 text-black px-6 py-3 rounded-full hover:bg-cyan-500 transition'>
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>

        <footer className=" flex flex-col text-center space-y-3 pt-12 border-t border-white/10">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400/80"> Created by  (Braa Alshoumary)  </p>
          <p className="text-lg text-cyan-400/80">
             2025
          </p>
        </footer>
      </div>
    </div>
  );
};

export default About;
