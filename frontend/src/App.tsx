import { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { ProductCard, type ItemData } from './components/ProductCard';
import { CartDrawer, type CartItem } from './components/CartDrawer';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminPanel } from './components/AdminPanel';
import { AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from './config/api';

interface Category {
  id: number;
  name: string;
}

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<ItemData[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Estados do Administrador
  const [adminToken, setAdminToken] = useState<string | null>(() =>
    localStorage.getItem('proplastik_admin_token')
  );
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Estado para o Modal de Alerta de Quantidade Máxima
  const [stockAlert, setStockAlert] = useState<{
    item: ItemData;
    requestedQty: number;
  } | null>(null);

  const loadPublicData = useCallback(() => {
    fetch(`${API_BASE_URL}/api/public/categories`)
      .then((res) => res.json())
      .then((data: Category[]) => setCategories(data))
      .catch((err) => console.error('Erro categorias:', err));

    const url = selectedCategoryId
      ? `${API_BASE_URL}/api/public/items?category_id=${selectedCategoryId}`
      : `${API_BASE_URL}/api/public/items`;

    fetch(url)
      .then((res) => res.json())
      .then((data: ItemData[]) => setItems(data))
      .catch((err) => console.error('Erro itens:', err));
  }, [selectedCategoryId]);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  const handleAddToCart = (item: ItemData, quantity: number) => {
    const existing = cart.find((c) => c.item.id === item.id);
    const totalDesired = (existing ? existing.quantity : 0) + quantity;

    if (totalDesired > item.remaining_units) {
      setStockAlert({ item, requestedQty: totalDesired });
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((c) => c.item.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += quantity;
        return copy;
      }
      return [...prev, { item, quantity }];
    });
  };

  const handleUpdateQuantity = (itemId: number, newQty: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.item.id === itemId) {
          const clamped = Math.min(Math.max(1, newQty), c.item.remaining_units);
          return { ...c, quantity: clamped };
        }
        return c;
      })
    );
  };

  const handleRemoveItem = (itemId: number) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem('proplastik_admin_token', token);
    setAdminToken(token);
    setIsAdminPanelOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('proplastik_admin_token');
    setAdminToken(null);
    setIsAdminPanelOpen(false);
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout
      categories={categories}
      selectedCategoryId={selectedCategoryId}
      onSelectCategory={setSelectedCategoryId}
      cartCount={cart.reduce((acc, c) => acc + c.quantity, 0)}
      onOpenCart={() => setIsCartOpen(true)}
      onOpenAdminLogin={() => setIsLoginModalOpen(true)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      isAdminLoggedIn={!!adminToken}
      onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
    >
      {/* Grade de Produtos */}
      <div className="py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-black text-proplastik-dark uppercase tracking-tight">
            {selectedCategoryId
              ? categories.find((c) => c.id === selectedCategoryId)?.name
              : 'Todos os Produtos Disponíveis'}
          </h2>
          <span className="text-xs text-[#74808b]">
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'} com estoque
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white p-12 rounded border border-[#E0E0E0] text-center text-[#9099a2]">
            <p className="text-sm">Nenhum produto com estoque disponível no momento nesta categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredItems.map((item) => (
              <ProductCard key={item.id} item={item} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}
      </div>

      {/* Gaveta do Carrinho */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCart([])}
        onReservationComplete={loadPublicData}
      />

      {/* Modal de Login do Lojista */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Painel Gerencial do Administrador */}
      {adminToken && (
        <AdminPanel
          isOpen={isAdminPanelOpen}
          token={adminToken}
          onClose={() => setIsAdminPanelOpen(false)}
          onLogout={handleLogout}
          onDataChanged={loadPublicData}
        />
      )}

      {/* Modal de Alerta de Quantidade Máxima Disponível */}
      {stockAlert && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle size={24} />
              <h3 className="font-bold text-sm">Quantidade Indisponível</h3>
            </div>

            <p className="text-xs text-[#5D5656] leading-relaxed">
              Você solicitou <strong>{stockAlert.requestedQty} unidades</strong> de{' '}
              <em>{stockAlert.item.name}</em>, mas a loja de São Vicente possui apenas{' '}
              <strong className="text-proplastik-dark">{stockAlert.item.remaining_units} unidades</strong> em estoque.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setCart((prev) => {
                    const filtered = prev.filter((c) => c.item.id !== stockAlert.item.id);
                    return [
                      ...filtered,
                      { item: stockAlert.item, quantity: stockAlert.item.remaining_units },
                    ];
                  });
                  setStockAlert(null);
                }}
                className="w-full bg-proplastik-main hover:bg-proplastik-dark text-white font-bold py-2 rounded text-xs uppercase"
              >
                Reservar apenas as {stockAlert.item.remaining_units} restantes
              </button>
              <button
                onClick={() => setStockAlert(null)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-[#5D5656] font-bold py-2 rounded text-xs uppercase"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}