import { useState } from 'react';
import Header from '../components/layout/Header';
import { useApp } from '../store/context';
import { Plus, Layout, Trash2, Star, X, GripVertical } from 'lucide-react';
import type { Template, TemplateSection } from '../types';

export default function TemplatesPage() {
  const { currentUser, templates, addTemplate, deleteTemplate } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'diplomado' | 'curso'>('diplomado');
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  if (!currentUser) return null;

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    setSections(prev => [...prev, {
      id: `ts-new-${Date.now()}`,
      title: newSectionTitle,
      description: newSectionDesc,
      order: prev.length + 1,
      required: true,
    }]);
    setNewSectionTitle('');
    setNewSectionDesc('');
  };

  const handleRemoveSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleCreate = () => {
    if (!newName.trim() || sections.length === 0) return;
    const template: Template = {
      id: `tpl-${Date.now()}`,
      name: newName,
      description: newDesc,
      type: newType,
      sections,
      isDefault: false,
      createdBy: currentUser.id,
    };
    addTemplate(template);
    setShowCreate(false);
    setNewName('');
    setNewDesc('');
    setSections([]);
  };

  return (
    <div className="page-enter">
      <Header title="Plantillas" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Plantillas</h2>
            <p className="text-gray-500">Gestiona las plantillas de estructura para temas y cursos</p>
          </div>
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Nueva Plantilla
            </button>
          )}
        </div>

        <div className="grid gap-4">
          {templates.map(tpl => (
            <div key={tpl.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <Layout size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{tpl.name}</span>
                      {tpl.isDefault && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                          <Star size={10} /> Predeterminada
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        tpl.type === 'diplomado' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {tpl.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{tpl.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{tpl.sections.length} secciones</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setExpandedTemplate(expandedTemplate === tpl.id ? null : tpl.id)}
                    className="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    {expandedTemplate === tpl.id ? 'Ocultar' : 'Ver secciones'}
                  </button>
                  {currentUser.role === 'admin' && !tpl.isDefault && (
                    <button
                      onClick={() => deleteTemplate(tpl.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              {expandedTemplate === tpl.id && (
                <div className="border-t border-gray-100 p-5 bg-gray-50/50">
                  <div className="space-y-2">
                    {tpl.sections.map((section, idx) => (
                      <div key={section.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
                        <span className="text-xs font-bold text-gray-400 mt-0.5 w-6">{idx + 1}.</span>
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-800">{section.title}</div>
                          <div className="text-xs text-gray-500">{section.description}</div>
                          {section.subsections && section.subsections.length > 0 && (
                            <div className="mt-2 ml-4 space-y-1">
                              {section.subsections.map((sub, subIdx) => (
                                <div key={sub.id} className="text-xs text-gray-600">
                                  <span className="font-medium">{idx + 1}.{subIdx + 1}</span> {sub.title}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {section.required && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded">Requerido</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Create Template Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Nueva Plantilla</h3>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la plantilla</label>
                    <input value={newName} onChange={e => setNewName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nombre de la plantilla" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select value={newType} onChange={e => setNewType(e.target.value as 'diplomado' | 'curso')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="diplomado">Diplomado</option>
                      <option value="curso">Curso</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
                  <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Secciones</h4>
                  <div className="space-y-2 mb-3">
                    {sections.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <GripVertical size={14} className="text-gray-300" />
                        <span className="text-xs font-bold text-gray-400">{i + 1}.</span>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{s.title}</div>
                          <div className="text-xs text-gray-500">{s.description}</div>
                        </div>
                        <button onClick={() => handleRemoveSection(s.id)} className="text-gray-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)}
                      placeholder="Titulo de seccion" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    <input value={newSectionDesc} onChange={e => setNewSectionDesc(e.target.value)}
                      placeholder="Descripcion" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    <button onClick={handleAddSection}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    Cancelar
                  </button>
                  <button onClick={handleCreate}
                    disabled={!newName.trim() || sections.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    Crear Plantilla
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
