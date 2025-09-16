import React, { useEffect, useState } from "react";

// API base - change if backend runs elsewhere
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    const path = mode === 'login' ? '/auth/login' : '/auth/register';
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg(j.error || 'Error');
        return;
      }
      if (mode === 'login') {
        localStorage.setItem('token', j.token);
        onLogin();
      } else {
        setMsg('Registro OK. Ahora logueate.');
        setMode('login');
      }
    } catch (err) {
      console.error(err);
      setMsg('Error de red.');
    }
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-semibold mb-2">{mode === 'login' ? 'Ingresar' : 'Registrarse'}</h3>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="p-2 border rounded" required />
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" className="p-2 border rounded" required />
        <button className="px-3 py-1 rounded bg-indigo-600 text-white">{mode==='login' ? 'Ingresar' : 'Crear cuenta'}</button>
      </form>
      <div className="mt-2 text-sm text-red-600">{msg}</div>
      <div className="mt-2 text-sm">
        {mode==='login' ? (
          <button onClick={()=>setMode('register')} className="underline">Crear cuenta</button>
        ) : (
          <button onClick={()=>setMode('login')} className="underline">Volver a ingresar</button>
        )}
      </div>
    </div>
  );
}

function HostPanel({ onLogout }) {
  const [myListings, setMyListings] = useState([]);
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState('Departamento');
  const [image, setImage] = useState('https://picsum.photos/seed/new/400/300');
  const [msg, setMsg] = useState('');

  async function fetchMy() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/my_listings`, { headers: { Authorization: 'Bearer '+token } });
    if (res.ok) {
      const j = await res.json();
      setMyListings(j);
    }
  }

  useEffect(()=>{ fetchMy(); }, []);

  async function create(e) {
    e.preventDefault();
    setMsg('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/create_listing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer '+token },
        body: JSON.stringify({ title, city, price: Number(price), type, description: title, image })
      });
      const j = await res.json();
      if (!res.ok) { setMsg(j.error||'Error'); return; }
      setMsg('Listing creado.');
      setTitle(''); setCity(''); setPrice('');
      fetchMy();
    } catch (err) {
      console.error(err); setMsg('Error de red.');
    }
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Panel de anfitrión</h3>
        <button onClick={()=>{ localStorage.removeItem('token'); onLogout(); }} className="text-sm underline">Salir</button>
      </div>

      <form onSubmit={create} className="flex flex-col gap-2 mb-4">
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título" className="p-2 border rounded" required />
        <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Ciudad" className="p-2 border rounded" required />
        <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Precio" className="p-2 border rounded" required />
        <select value={type} onChange={e=>setType(e.target.value)} className="p-2 border rounded">
          <option>Departamento</option>
          <option>Casa</option>
          <option>Habitación</option>
        </select>
        <input value={image} onChange={e=>setImage(e.target.value)} placeholder="URL imagen" className="p-2 border rounded" />
        <button className="px-3 py-1 rounded bg-green-600 text-white">Crear</button>
      </form>
      <div className="text-sm text-green-700">{msg}</div>
      <div className="mt-3">
        <h4 className="font-semibold mb-2">Mis alojamientos</h4>
        <div className="grid gap-2">
          {myListings.map(l => (
            <div key={l.id} className="p-2 border rounded bg-gray-50">
              <div className="font-semibold">{l.title}</div>
              <div className="text-sm">{l.city} · ${l.price}</div>
            </div>
          ))}
          {myListings.length===0 && <div className="text-gray-500">No tenés alojamientos aún.</div>}
        </div>
      </div>
    </div>
  );
}

export default function AirbnbLite() {
  const [listings, setListings] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingMsg, setBookingMsg] = useState("");
  const [logged, setLogged] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    fetchListings();
  }, []);

  async function fetchListings() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/listings`);
      const data = await res.json();
      setListings(data);
    } catch (err) {
      console.error("Error fetching listings:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = listings.filter(l =>
    l.title.toLowerCase().includes(query.toLowerCase()) ||
    l.city.toLowerCase().includes(query.toLowerCase())
  );

  async function book(listingId) {
    setBookingMsg("");
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? 'Bearer '+token : undefined },
        body: JSON.stringify({ listing_id: listingId })
      });
      const j = await res.json();
      if (res.ok) {
        setBookingMsg(`Reserva confirmada: ID ${j.booking_id}`);
      } else {
        setBookingMsg(`Error: ${j.error || 'no se pudo reservar'}`);
      }
    } catch (err) {
      console.error(err);
      setBookingMsg("Error de red al intentar reservar");
    }
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <header className="max-w-4xl mx-auto mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Airbnb Lite</h1>
          <p className="text-sm text-gray-600">Prototipo — ahora con registro e panel de anfitrión.</p>
        </div>
        <div>
          {logged ? (
            <button onClick={()=>{ localStorage.removeItem('token'); setLogged(false); }} className="px-3 py-1 rounded bg-gray-200">Salir</button>
          ) : (
            <span className="text-sm text-gray-600">No conectado</span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto grid gap-6 md:grid-cols-3">
        <section className="md:col-span-2">
          <div className="mb-4 flex gap-3">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar ciudad o título..."
              className="flex-1 p-2 border rounded"
            />
            <button onClick={fetchListings} className="px-4 py-2 rounded shadow bg-white">Refrescar</button>
          </div>

          {loading ? (
            <div>Cargando alojamientos...</div>
          ) : (
            <div className="grid gap-4">
              {filtered.map(l => (
                <article key={l.id} className="p-4 bg-white rounded shadow flex gap-4">
                  <img src={l.image} alt="thumb" className="w-32 h-24 object-cover rounded" />
                  <div className="flex-1">
                    <h2 className="font-semibold">{l.title}</h2>
                    <p className="text-sm text-gray-500">{l.city} · {l.type}</p>
                    <p className="mt-2">${l.price} por noche</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => setSelected(l)} className="px-3 py-1 rounded bg-indigo-600 text-white">Ver</button>
                      <button onClick={() => book(l.id)} className="px-3 py-1 rounded bg-green-600 text-white">Reservar</button>
                    </div>
                  </div>
                </article>
              ))}

              {filtered.length === 0 && <div className="text-gray-500">No hay resultados.</div>}
            </div>
          )}
        </section>

        <aside className="p-4 bg-white rounded shadow">
          {!logged ? (
            <Auth onLogin={()=>setLogged(true)} />
          ) : (
            <HostPanel onLogout={()=>setLogged(false)} />
          )}

          <div className="mt-4">
            <h4 className="font-semibold">Estado reserva</h4>
            <p className="text-sm text-gray-700">{bookingMsg || 'Sin acciones recientes.'}</p>
          </div>
        </aside>
      </main>

      <footer className="max-w-4xl mx-auto mt-8 text-sm text-gray-500">Prototipo — no usar en producción sin validar seguridad y pagos.</footer>
    </div>
  );
}
