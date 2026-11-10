import React, { type ReactNode } from 'react';
import { Search, ShoppingBag, MapPin, Phone, ShieldCheck, Clock, UserCheck } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  categories: { id: number; name: string }[];
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdminLogin: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isAdminLoggedIn?: boolean;
  onOpenAdminPanel?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  categories,
  selectedCategoryId,
  onSelectCategory,
  cartCount,
  onOpenCart,
  onOpenAdminLogin,
  searchQuery,
  onSearchChange,
  isAdminLoggedIn,
  onOpenAdminPanel
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      {/* 1. Pre-Header: Aviso Oficial de Retirada */}
      <div className="bg-proplastik-main text-white text-xs py-1.5 px-4 text-center font-medium border-b border-red-700">
        <span>📍 Unidade São Vicente: Rua Jacob Emmerich, Centro — Consulte o catálogo e reserve para retirada no balcão!</span>
      </div>

      {/* 2. Header Principal */}
      <header className="bg-proplastik-main text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-318 mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo da Proplastik */}
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => onSelectCategory(null)}>
            <div className="bg-white text-proplastik-main font-black text-2xl tracking-tighter px-2.5 py-0.5 rounded shadow-inner">
              PROPLASTIK
            </div>
            <span className="text-xs uppercase font-bold tracking-widest text-proplastik-yellow">São Vicente</span>
          </div>

          {/* Barra de Busca */}
          <div className="flex-1 max-w-xl min-w-65">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar embalagens, formas, descartáveis..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full py-2.5 pl-4 pr-11 text-sm text-[#383838] bg-white rounded focus:outline-none shadow-sm"
              />
              <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-proplastik-main p-1 hover:opacity-80">
                <Search size={19} />
              </button>
            </div>
          </div>

          {/* Ações: Acesso Admin e Botão do Carrinho */}
          <div className="flex items-center gap-5">
            {isAdminLoggedIn ? (
              <button
                onClick={onOpenAdminPanel}
                className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 py-1.5 px-3 rounded transition"
              >
                <UserCheck size={18} className="text-proplastik-yellow" />
                <span>Painel Admin</span>
              </button>
            ) : (
              <button
                onClick={onOpenAdminLogin}
                className="text-xs hover:underline text-white/90 flex flex-col text-left"
              >
                <span>Acesso Lojista</span>
                <span className="font-bold text-white">Entrar (Admin)</span>
              </button>
            )}

            {/* Botão do Carrinho de Reserva */}
            <button
              onClick={onOpenCart}
              className="relative p-2 bg-white/10 hover:bg-white/20 rounded-full transition flex items-center justify-center"
              aria-label="Ver itens da reserva"
            >
              <ShoppingBag size={24} className="text-white" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-proplastik-yellowBadge text-proplastik-dark font-black text-[11px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 3. Barra de Navegação por Categorias */}
        <nav className="bg-proplastik-dark border-t border-red-800">
          <div className="max-w-318 mx-auto px-4 flex items-center gap-2 overflow-x-auto text-sm py-2">
            <button
              onClick={() => onSelectCategory(null)}
              className={`px-3 py-1 rounded whitespace-nowrap font-medium transition ${
                selectedCategoryId === null
                  ? 'bg-white text-proplastik-dark font-bold'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Todos os Itens
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3 py-1 rounded whitespace-nowrap font-medium transition ${
                  selectedCategoryId === cat.id
                    ? 'bg-white text-proplastik-dark font-bold'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* 4. Barra de Destaques Operacionais */}
      <section className="bg-white border-b border-[#E0E0E0] py-3 text-xs text-[#5D5656]">
        <div className="max-w-318 mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <Clock size={20} className="text-proplastik-main" />
            <div>
              <p className="font-bold text-proplastik-main">Separação Ágil</p>
              <p>Retirada expressa na loja</p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <ShieldCheck size={20} className="text-proplastik-main" />
            <div>
              <p className="font-bold text-proplastik-main">Reserva Garantida</p>
              <p>Lote bloqueado no estoque</p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <MapPin size={20} className="text-proplastik-main" />
            <div>
              <p className="font-bold text-proplastik-main">Centro de São Vicente</p>
              <p>Rua Jacob Emmerich</p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <Phone size={20} className="text-proplastik-main" />
            <div>
              <p className="font-bold text-proplastik-main">Pague no Balcão</p>
              <p>Pix, dinheiro ou cartão</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Área de Conteúdo */}
      <main className="flex-1 max-w-318 w-full mx-auto p-4">
        {children}
      </main>

      {/* 6. Rodapé */}
      <footer className="bg-white border-t border-[#E0E0E0] text-xs text-[#727272] mt-12">
        <div className="max-w-318 mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="font-bold text-proplastik-dark mb-3 text-sm">Loja Física São Vicente</h4>
            <p className="flex items-start gap-1.5 mb-2">
              <MapPin size={16} className="text-proplastik-main shrink-0 mt-0.5" />
              <span>Rua Jacob Emmerich, Centro - São Vicente / SP</span>
            </p>
            <p className="mb-1"><strong>Segunda a Sexta:</strong> 08h30 às 18h30</p>
            <p><strong>Sábado:</strong> 08h30 às 14h00</p>
          </div>

          <div>
            <h4 className="font-bold text-proplastik-dark mb-3 text-sm">Regras da Reserva Online</h4>
            <p className="mb-2">• As reservas ficam guardadas no balcão por até 24 horas após a confirmação.</p>
            <p className="mb-2">• O pagamento é realizado diretamente na retirada do pedido.</p>
            <p>• Apresente o código da reserva gerado pelo sistema ao atendente.</p>
          </div>

          <div>
            <h4 className="font-bold text-proplastik-dark mb-3 text-sm">Consultoria Acadêmica</h4>
            <p className="mb-2">Sistema desenvolvido para otimização de fluxo de atendimento e eliminação de rupturas de estoque.</p>
            <p>© 2026 Proplastik São Vicente - Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};