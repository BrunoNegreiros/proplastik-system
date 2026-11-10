import React, { useState } from 'react';

export interface ItemData {
  id: number;
  name: string;
  photo_url: string;
  price: number;
  discount_price: number | null;
  remaining_units: number;
  category_id: number;
}

interface ProductCardProps {
  item: ItemData;
  onAddToCart: (item: ItemData, quantity: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ item, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const hasDiscount = item.discount_price !== null && item.discount_price < item.price;
  const currentPrice = hasDiscount ? item.discount_price! : item.price;

  const handleAdd = () => {
    onAddToCart(item, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="bg-white rounded border border-[#E0E0E0] hover:border-proplastik-main transition-shadow hover:shadow-md flex flex-col justify-between p-3 relative group">
      {/* Badge de Desconto */}
      {hasDiscount && (
        <span className="absolute top-2 left-2 bg-proplastik-yellow text-proplastik-dark font-black text-[10px] px-2 py-0.5 rounded shadow-sm uppercase tracking-wide">
          Oferta
        </span>
      )}

      {/* Imagem do Produto */}
      <div className="w-full h-44 flex items-center justify-center p-2 mb-2 bg-[#F9F9F9] rounded overflow-hidden">
        <img
          src={item.photo_url || 'https://via.placeholder.com/200?text=Sem+Foto'}
          alt={item.name}
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200?text=Proplastik';
          }}
        />
      </div>

      {/* Informações */}
      <div>
        <h3 className="font-bold text-xs sm:text-sm text-[#383838] line-clamp-2 min-h-9 sm:min-h-10 mb-1" title={item.name}>
          {item.name}
        </h3>

        {/* Preços */}
        <div className="mb-2">
          {hasDiscount && (
            <span className="text-[11px] text-[#9099a2] line-through block">
              R$ {item.price.toFixed(2)}
            </span>
          )}
          <span className="text-base sm:text-lg font-black text-proplastik-main">
            R$ {currentPrice.toFixed(2)}
          </span>
        </div>

        {/* Status de Estoque */}
        <p className="text-[11px] text-[#5D5656] mb-3">
          Estoque: <strong className="text-proplastik-dark">{item.remaining_units} un.</strong>
        </p>
      </div>

      {/* Controles de Quantidade e Reserva */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#F1F2F3]">
        <input
          type="number"
          min="1"
          max={item.remaining_units}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-14 text-center border border-[#D4D2D2] rounded py-1.5 text-xs font-bold text-[#383838] focus:outline-none focus:border-proplastik-main"
        />

        <button
          onClick={handleAdd}
          className={`flex-1 py-1.5 px-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            added
              ? 'bg-emerald-600 text-white'
              : 'bg-proplastik-main hover:bg-proplastik-dark text-white'
          }`}
        >
          {added ? (
            <>
              Reservado
            </>
          ) : (
            <>
              Reservar
            </>
          )}
        </button>
      </div>
    </div>
  );
};