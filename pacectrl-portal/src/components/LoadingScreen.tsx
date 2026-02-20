import { Ship, Waves } from "lucide-react";

export default function LoadingScreen({ 
  message = "Loading...",
  fullScreen = true 
}: { 
  message?: string;
  fullScreen?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center bg-slate-900 text-white relative overflow-hidden ${fullScreen ? 'h-screen w-full' : 'h-full w-full rounded-xl'}`}>
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <div className="w-64 h-64 bg-teal-500 rounded-full blur-3xl animate-pulse"></div>
      </div>
      
      {/* Icon container */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-24 h-24 flex items-center justify-center mb-6">
          {/* Outer spinning ring */}
          <div className="absolute inset-0 rounded-full border-t-2 border-teal-400 border-r-2 border-transparent animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-b-2 border-teal-200 border-l-2 border-transparent animate-[spin_2s_linear_reverse]"></div>
          
          {/* Inner bobbing ship */}
          <div className="animate-[bounce_2s_ease-in-out_infinite] relative z-10">
            <Ship className="w-8 h-8 text-teal-300" />
          </div>
          
          {/* Waves at the bottom of the circle */}
          <div className="absolute bottom-3 text-teal-500/50">
            <Waves className="w-10 h-10" />
          </div>
        </div>
        
        <h2 className="text-lg font-medium tracking-wide text-slate-200 animate-pulse">
          {message}
        </h2>
      </div>
    </div>
  );
}
