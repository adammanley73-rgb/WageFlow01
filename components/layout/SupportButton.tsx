'use client'

export default function SupportButton() {
  const handleSupportClick = () => {
    window.location.href = 'mailto:support@thebusinessconsortiumltf?subject=WageFlow Support Request'
  }

  return (
    <button
      onClick={handleSupportClick}
      className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-colors duration-200 z-50"
    >
      SUPPORT
    </button>
  )
}