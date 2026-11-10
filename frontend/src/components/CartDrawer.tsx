import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, CheckCircle2, ShoppingBag } from 'lucide-react';
import { type ItemData } from './ProductCard';
import { API_BASE_URL } from '../config/api';

export interface CartItem {
  item: ItemData;
  quantity: number;
}

interface ReservationItemResponse {
  item_id: number;
  item_name: string;
  requested_quantity: number;
  reserved_quantity: number;
  unit_price: number;
  note: string;
}

interface ReservationResponse {
  pickup_code: string;
  status: string;
  total_amount: number;
  items: ReservationItemResponse[];
  customer_name: string;
  customer_phone: string;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (itemId: number, newQty: number) => void;
  onRemoveItem: (itemId: number) => void;
  onClearCart: () => void;
  onReservationComplete?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onReservationComplete,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [reservationSuccess, setReservationSuccess] = useState<ReservationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const totalAmount = cart.reduce((acc, current) => {
    const price = current.item.discount_price || current.item.price;
    return acc + price * current.quantity;
  }, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMsg('Informe seu nome e WhatsApp para a identificação da retirada.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/public/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          items: cart.map((c) => ({ item_id: c.item.id, quantity: c.quantity })),
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { detail?: string };
        throw new Error(errorData.detail || 'Falha ao processar reserva.');
      }

      const result = (await response.json()) as ReservationResponse;
      setReservationSuccess(result);
      onClearCart();
      if (onReservationComplete) onReservationComplete();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Erro inesperado ao processar reserva.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between">
        {/* Cabeçalho */}
        <div className="bg-proplastik-main text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} />
            <h2 className="font-bold text-sm uppercase tracking-wide">Itens da Pré-Reserva</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo Central */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {reservationSuccess ? (
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 size={56} className="text-emerald-500 mx-auto" />
              <h3 className="text-lg font-black text-proplastik-main">Reserva Realizada!</h3>
              
              <div className="bg-[#FFF9E6] border-2 border-dashed border-proplastik-yellow p-4 rounded-lg">
                <p className="text-xs text-[#5D5656] uppercase font-bold tracking-wider mb-1">
                  Apresente este código no balcão:
                </p>
                <span className="text-3xl font-black text-proplastik-dark tracking-widest block py-1">
                  {reservationSuccess.pickup_code}
                </span>
                <p className="text-[11px] text-[#74808b]">
                  Cliente: {reservationSuccess.customer_name} ({reservationSuccess.customer_phone})
                </p>
              </div>

              {reservationSuccess.status === 'AJUSTADO_POR_ESTOQUE' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded text-xs text-left flex items-start gap-2">
                  <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Atenção: Um ou mais itens foram ajustados ao estoque real restante no momento da finalização.
                  </span>
                </div>
              )}

              <div className="text-left text-xs bg-[#F9F9F9] p-3 rounded border border-[#E0E0E0] space-y-1">
                <p className="font-bold text-[#383838] mb-1">Itens reservados:</p>
                {reservationSuccess.items.map((it) => (
                  <div key={it.item_id} className="flex justify-between py-0.5 border-b border-gray-100 last:border-none">
                    <span>{it.reserved_quantity}x {it.item_name}</span>
                    <span className="font-bold">R$ {(it.unit_price * it.reserved_quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="pt-2 flex justify-between font-black text-sm text-proplastik-main">
                  <span>Total a pagar na retirada:</span>
                  <span>R$ {reservationSuccess.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setReservationSuccess(null);
                  onClose();
                }}
                className="w-full bg-proplastik-main hover:bg-proplastik-dark text-white font-bold py-2.5 rounded text-xs uppercase"
              >
                Concluir e Voltar ao Catálogo
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="text-center py-16 text-[#9099a2]">
              <ShoppingBag size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Sua reserva está vazia.</p>
              <p className="text-xs">Selecione embalagens no catálogo para começar.</p>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-3">
                {cart.map(({ item, quantity }) => {
                  const price = item.discount_price || item.price;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 bg-[#F9F9F9] rounded border border-[#E0E0E0]"
                    >
                      <img
                        src={item.photo_url}
                        alt={item.name}
                        className="w-12 h-12 object-contain bg-white rounded border border-gray-100 p-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#383838] truncate">{item.name}</p>
                        <p className="text-xs text-proplastik-main font-bold">R$ {price.toFixed(2)}</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max={item.remaining_units}
                          value={quantity}
                          onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-12 text-center text-xs border border-gray-300 rounded py-1 font-bold"
                        />
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="text-[#9099a2] hover:text-red-600 p-1"
                          title="Remover item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form id="checkout-form" onSubmit={handleCheckout} className="pt-4 border-t border-[#E0E0E0] space-y-3">
                <h4 className="text-xs font-bold uppercase text-[#5D5656]">Dados para Retirada no Balcão</h4>
                <div>
                  <label className="text-[11px] font-bold text-[#5D5656] block mb-1">Seu Nome / Razão Social</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maria Confeitaria"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full text-xs p-2 border border-[#D4D2D2] rounded focus:outline-none focus:border-proplastik-main"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5D5656] block mb-1">WhatsApp para Contato</label>
                  <input
                    type="tel"
                    required
                    placeholder="(13) 99999-9999"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full text-xs p-2 border border-[#D4D2D2] rounded focus:outline-none focus:border-proplastik-main"
                  />
                </div>
              </form>
            </>
          )}
        </div>

        {/* Rodapé da Gaveta */}
        {!reservationSuccess && cart.length > 0 && (
          <div className="p-4 bg-[#F9F9F9] border-t border-[#E0E0E0] space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-[#5D5656]">Total Estimado:</span>
              <span className="text-xl font-black text-proplastik-main">R$ {totalAmount.toFixed(2)}</span>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={loading}
              className="w-full bg-proplastik-main hover:bg-proplastik-dark text-white font-bold py-3 rounded text-xs uppercase tracking-wide transition shadow disabled:opacity-50"
            >
              {loading ? 'Validando estoque...' : 'Confirmar Reserva para Balcão'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};