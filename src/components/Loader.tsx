export default function Loader() {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 z-50">
        <div className="flex flex-col items-center gap-6">
          {/* Three dots loader */}
          <div className="flex gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-4 h-4 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
          
          <p className="text-xl font-bold text-gray-700 animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }