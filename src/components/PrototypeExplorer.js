"use client"; 

import { useState } from 'react';
import StructureChart from '@/components/StructureChart'; // jsconfig.json'daki @/ alias'ını kullanıyoruz
import { projectData } from '@/app/data'; // Veriyi de @/ alias'ı ile alıyoruz

export default function PrototypeExplorer({ categories }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id || '');
  const activeCategory = categories.find(cat => cat.id === selectedCategoryId);

  return (
    <main className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sol Taraf (Aside) */}
      <aside className="lg:col-span-1">
        <div className="sticky top-8 bg-white/70 backdrop-blur-sm p-6 rounded-xl border border-gray-200">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Proje Yapısı</h3>
          <div className="chart-container mb-6">
            <StructureChart categories={categories} />
          </div>
          <h4 className="font-semibold mb-3 text-gray-700">Kategoriler</h4>
          <nav id="category-nav" className="flex flex-col space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`nav-button w-full text-left p-3 rounded-lg hover:bg-teal-100 hover:text-teal-800 ${
                  selectedCategoryId === category.id ? 'active' : ''
                }`}
              >
                {`${category.name} (${category.files.length})`}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Sağ Taraf (İçerik) */}
      <div id="content-display" className="lg:col-span-3">
        <div className="mb-4">
          <h3 id="category-title" className="text-2xl font-bold text-gray-800">
            {activeCategory?.name}
          </h3>
        </div>
        <div id="page-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeCategory?.files.map((file) => (
            <div key={file.name} className="page-card p-5 rounded-lg flex flex-col">
              <div className="flex-grow">
                <h4 className="font-bold text-lg text-teal-700">{file.name}</h4>
                <p className="text-gray-600 text-sm mt-2">{file.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}