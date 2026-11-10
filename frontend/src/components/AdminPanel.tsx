import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Package,
  ClipboardList,
  Tags,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  XCircle,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { type ItemData } from './ProductCard';
import { API_BASE_URL } from '../config/api';

interface Category {
  id: number;
  name: string;
}

interface ReservationItemDetail {
  item_id: number;
  item_name: string;
  unit_price: number;
  quantity: number;
}

interface ReservationDetail {
  id: number;
  pickup_code: string;
  customer_name: string;
  customer_phone: string;
  created_at: string;
  status: string;
  items: ReservationItemDetail[];
}

interface AdminPanelProps {
  isOpen: boolean;
  token: string;
  onClose: () => void;
  onLogout: () => void;
  onDataChanged: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  token,
  onClose,
  onLogout,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'reservations' | 'items' | 'categories'>('reservations');
  const [reservations, setReservations] = useState<ReservationDetail[]>([]);
  const [items, setItems] = useState<ItemData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Estado do formulário de Produto
  const [editingItem, setEditingItem] = useState<ItemData | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemPhoto, setItemPhoto] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDiscount, setItemDiscount] = useState('');
  const [itemStock, setItemStock] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState<number>(1);

  // Estado do formulário de Categoria
  const [newCategoryName, setNewCategoryName] = useState('');

  // Busca disparada por ações de usuário
  const reloadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [resReservations, resItems, resCategories] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/reservations`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/items`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/categories`, { headers }),
      ]);

      if (resReservations.status === 401) {
        onLogout();
        return;
      }

      if (resReservations.ok) setReservations((await resReservations.json()) as ReservationDetail[]);
      if (resItems.ok) setItems((await resItems.json()) as ItemData[]);
      if (resCategories.ok) {
        const cats = (await resCategories.json()) as Category[];
        setCategories(cats);
        setItemCategoryId((prev) => (cats.length > 0 && !prev ? cats[0].id : prev));
      }
    } catch (err) {
      console.error('Erro ao recarregar dados do painel:', err);
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  // Efeito isolado para abertura do modal
  useEffect(() => {
    if (!isOpen || !token) return;

    let isMounted = true;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE_URL}/api/admin/reservations`, { headers }),
      fetch(`${API_BASE_URL}/api/admin/items`, { headers }),
      fetch(`${API_BASE_URL}/api/admin/categories`, { headers }),
    ])
      .then(async ([resReservations, resItems, resCategories]) => {
        if (!isMounted) return;
        if (resReservations.status === 401) {
          onLogout();
          return;
        }
        if (resReservations.ok) {
          const resData = (await resReservations.json()) as ReservationDetail[];
          if (isMounted) setReservations(resData);
        }
        if (resItems.ok) {
          const itemsData = (await resItems.json()) as ItemData[];
          if (isMounted) setItems(itemsData);
        }
        if (resCategories.ok) {
          const cats = (await resCategories.json()) as Category[];
          if (isMounted) {
            setCategories(cats);
            setItemCategoryId((prev) => (cats.length > 0 && !prev ? cats[0].id : prev));
          }
        }
      })
      .catch((err) => console.error('Erro ao sincronizar painel:', err));

    return () => {
      isMounted = false;
    };
  }, [isOpen, token, onLogout]);

  if (!isOpen) return null;

  // --- AÇÕES DE RESERVAS ---
  const handleUpdateStatus = async (reservationId: number, newStatus: string) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/reservations/${reservationId}/status?status_str=${encodeURIComponent(newStatus)}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        reloadData();
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  // --- AÇÕES DE PRODUTOS ---
  const startEditItem = (item: ItemData) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemPhoto(item.photo_url);
    setItemPrice(String(item.price));
    setItemDiscount(item.discount_price !== null ? String(item.discount_price) : '');
    setItemStock(String(item.remaining_units));
    setItemCategoryId(item.category_id);
  };

  const resetItemForm = () => {
    setEditingItem(null);
    setItemName('');
    setItemPhoto('');
    setItemPrice('');
    setItemDiscount('');
    setItemStock('');
    if (categories.length > 0) setItemCategoryId(categories[0].id);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: itemName,
      photo_url: itemPhoto,
      price: parseFloat(itemPrice) || 0,
      discount_price: itemDiscount.trim() !== '' ? parseFloat(itemDiscount) : null,
      remaining_units: parseInt(itemStock, 10) || 0,
      category_id: Number(itemCategoryId),
    };

    const url = editingItem
      ? `${API_BASE_URL}/api/admin/items/${editingItem.id}`
      : `${API_BASE_URL}/api/admin/items`;

    const method = editingItem ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      resetItemForm();
      reloadData();
      onDataChanged();
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm('Deseja realmente excluir este produto do catálogo?')) return;
    const res = await fetch(`${API_BASE_URL}/api/admin/items/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      reloadData();
      onDataChanged();
    }
  };

  // --- AÇÕES DE CATEGORIAS ---
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const res = await fetch(`${API_BASE_URL}/api/admin/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    });
    if (res.ok) {
      setNewCategoryName('');
      reloadData();
      onDataChanged();
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Excluir esta categoria?')) return;
    const res = await fetch(`${API_BASE_URL}/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      reloadData();
      onDataChanged();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-6">
      <div className="bg-white rounded-lg max-w-5xl w-full h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-gray-300">
        {/* Topo do Painel */}
        <div className="bg-proplastik-dark text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-black text-base sm:text-lg tracking-wide uppercase">
              Painel Gerencial — Proplastik São Vicente
            </h2>
            <p className="text-xs text-proplastik-yellow">
              Controle de Retiradas no Balcão e Inventário
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={reloadData}
              className="p-2 bg-white/10 hover:bg-white/20 rounded text-xs flex items-center gap-1"
              title="Atualizar dados"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              onClick={onLogout}
              className="p-2 bg-red-900/60 hover:bg-red-900 rounded text-xs flex items-center gap-1 text-red-100"
              title="Sair da conta Admin"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sair</span>
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Navegação de Abas */}
        <div className="bg-[#F1F2F3] border-b border-[#D4D2D2] px-6 flex gap-2 pt-2">
          <button
            onClick={() => setActiveTab('reservations')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t border-t border-x transition ${
              activeTab === 'reservations'
                ? 'bg-white text-proplastik-main border-[#D4D2D2]'
                : 'bg-transparent text-[#5D5656] border-transparent hover:bg-white/50'
            }`}
          >
            <ClipboardList size={16} />
            Reservas de Clientes ({reservations.length})
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t border-t border-x transition ${
              activeTab === 'items'
                ? 'bg-white text-proplastik-main border-[#D4D2D2]'
                : 'bg-transparent text-[#5D5656] border-transparent hover:bg-white/50'
            }`}
          >
            <Package size={16} />
            Produtos e Estoque ({items.length})
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t border-t border-x transition ${
              activeTab === 'categories'
                ? 'bg-white text-proplastik-main border-[#D4D2D2]'
                : 'bg-transparent text-[#5D5656] border-transparent hover:bg-white/50'
            }`}
          >
            <Tags size={16} />
            Categorias ({categories.length})
          </button>
        </div>

        {/* Corpo do Painel */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA]">
          {/* ABA 1: RESERVAS */}
          {activeTab === 'reservations' && (
            <div className="space-y-4">
              {reservations.length === 0 ? (
                <div className="text-center py-12 bg-white rounded border border-gray-200 text-gray-400 text-sm">
                  Nenhuma reserva registrada até o momento.
                </div>
              ) : (
                reservations.map((res) => {
                  const total = res.items.reduce(
                    (acc, it) => acc + it.unit_price * it.quantity,
                    0
                  );
                  return (
                    <div
                      key={res.id}
                      className="bg-white rounded border border-[#E0E0E0] p-4 shadow-xs flex flex-col md:flex-row justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-proplastik-yellow text-proplastik-dark font-black text-sm px-2.5 py-0.5 rounded tracking-wider">
                            {res.pickup_code}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                              res.status === 'CONCLUIDA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : res.status === 'CANCELADA'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {res.status}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(res.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>

                        <p className="text-xs text-[#383838]">
                          <strong>Cliente:</strong> {res.customer_name} —{' '}
                          <strong>WhatsApp:</strong> {res.customer_phone}
                        </p>

                        <div className="bg-[#F9F9F9] p-2.5 rounded border border-gray-100 text-xs space-y-1">
                          {res.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>
                                <strong>{it.quantity}x</strong> {it.item_name}
                              </span>
                              <span className="text-gray-600">
                                R$ {(it.unit_price * it.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          <div className="border-t border-gray-200 pt-1 flex justify-between font-bold text-proplastik-main">
                            <span>Total a cobrar no balcão:</span>
                            <span>R$ {total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex md:flex-col justify-end gap-2 shrink-0">
                        <button
                          onClick={() => handleUpdateStatus(res.id, 'CONCLUIDA')}
                          className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded transition"
                        >
                          <CheckCircle size={14} /> Confirmar Retirada
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(res.id, 'CANCELADA')}
                          className="flex items-center justify-center gap-1.5 bg-gray-200 hover:bg-red-100 hover:text-red-700 text-gray-700 text-xs font-bold px-3 py-2 rounded transition"
                        >
                          <XCircle size={14} /> Cancelar
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ABA 2: PRODUTOS E ESTOQUE */}
          {activeTab === 'items' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form
                onSubmit={handleSaveItem}
                className="bg-white p-4 rounded border border-[#E0E0E0] space-y-3 h-fit"
              >
                <h3 className="font-bold text-xs uppercase text-proplastik-dark border-b pb-2">
                  {editingItem ? `Editando #${editingItem.id}` : 'Cadastrar Novo Produto'}
                </h3>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    Nome do Produto
                  </label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Ex: Forma Acetato Ovo 500g"
                    className="w-full text-xs p-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    URL da Foto
                  </label>
                  <input
                    type="url"
                    required
                    value={itemPhoto}
                    onChange={(e) => setItemPhoto(e.target.value)}
                    placeholder="https://..."
                    className="w-full text-xs p-2 border border-gray-300 rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Preço Normal (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="w-full text-xs p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Preço Oferta (Opcional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemDiscount}
                      onChange={(e) => setItemDiscount(e.target.value)}
                      placeholder="Vazio = sem oferta"
                      className="w-full text-xs p-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Unidades em Estoque
                    </label>
                    <input
                      type="number"
                      required
                      value={itemStock}
                      onChange={(e) => setItemStock(e.target.value)}
                      className="w-full text-xs p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Categoria
                    </label>
                    <select
                      value={itemCategoryId}
                      onChange={(e) => setItemCategoryId(Number(e.target.value))}
                      className="w-full text-xs p-2 border border-gray-300 rounded bg-white"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-proplastik-main hover:bg-proplastik-dark text-white font-bold py-2 rounded text-xs uppercase"
                  >
                    {editingItem ? 'Salvar Alterações' : 'Adicionar Produto'}
                  </button>
                  {editingItem && (
                    <button
                      type="button"
                      onClick={resetItemForm}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-xs font-bold"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              <div className="lg:col-span-2 space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-white p-3 rounded border flex items-center justify-between gap-3 ${
                      item.remaining_units <= 0
                        ? 'border-red-300 bg-red-50/40'
                        : 'border-[#E0E0E0]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.photo_url}
                        alt={item.name}
                        className="w-12 h-12 object-contain bg-white border rounded p-1 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#383838] truncate">{item.name}</p>
                        <p className="text-[11px] text-gray-500">
                          Preço: <strong>R$ {item.price.toFixed(2)}</strong>
                          {item.discount_price && (
                            <span className="text-emerald-700 font-bold ml-2">
                              Oferta: R$ {item.discount_price.toFixed(2)}
                            </span>
                          )}
                        </p>
                        <span
                          className={`inline-block mt-0.5 text-[10px] font-black px-2 py-0.5 rounded ${
                            item.remaining_units <= 0
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-proplastik-dark'
                          }`}
                        >
                          {item.remaining_units <= 0
                            ? 'ESGOTADO (OCULTO NA LOJA)'
                            : `Estoque: ${item.remaining_units} un.`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => startEditItem(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar Produto / Repor Estoque"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Excluir Produto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 3: CATEGORIAS */}
          {activeTab === 'categories' && (
            <div className="max-w-xl space-y-4">
              <form onSubmit={handleCreateCategory} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nome da nova categoria (ex: Descartáveis, Confeitaria...)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 text-xs p-2.5 border border-gray-300 rounded bg-white"
                />
                <button
                  type="submit"
                  className="bg-proplastik-main hover:bg-proplastik-dark text-white text-xs font-bold px-4 py-2.5 rounded flex items-center gap-1.5"
                >
                  <Plus size={16} /> Criar Categoria
                </button>
              </form>

              <div className="bg-white rounded border border-[#E0E0E0] divide-y">
                {categories.map((cat) => (
                  <div key={cat.id} className="p-3 flex items-center justify-between text-xs">
                    <span className="font-bold text-[#383838]">
                      #{cat.id} — {cat.name}
                    </span>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-red-600 hover:bg-red-50 p-1.5 rounded"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};