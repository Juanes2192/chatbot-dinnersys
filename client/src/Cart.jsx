import React from 'react';

function Cart({ cartItems }) {
    return (
        <>
            <div style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '10px',
                backgroundColor: '#f9f9f9',
                marginTop: '20px'
            }}>
                <h3>Carrito de Compras</h3>
                {cartItems.length === 0 ? (
                    <p>El carrito está vacío.</p>
                ) : (
                    <ul>
                        {cartItems.map((item, index) => (
                            <li key={index}>
                                Producto: {item.product} - Cantidad: {item.quantity}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div>
                <button style={{
                    marginLeft: '10px',
                    padding: '10px 15px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#4CAF50',
                    color: '#fff'
                }}>
                    Hacer Pedido
                </button>
            </div>
        </>
    );
}

export default Cart;
