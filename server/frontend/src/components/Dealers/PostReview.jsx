import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../Auth";

export default function PostReview() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [dealer, setDealer] = useState(null);
  const [models, setModels] = useState([]);
  const [purchase, setPurchase] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api("/djangoapp/dealer/" + id, { signal: controller.signal }),
      api("/djangoapp/get_cars", { signal: controller.signal })
    ]).then(([detail, catalog]) => { setDealer(detail.dealer[0]); setModels(catalog.CarModels); })
      .catch(err => { if (err.name !== "AbortError") setError(err.message); });
    return () => controller.abort();
  }, [id]);
  async function submit(event) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await api("/djangoapp/add_review", { method: "POST", body: JSON.stringify({
        dealership: Number(id), review: form.get("review"), purchase,
        purchase_date: form.get("purchase_date"),
        car_model_id: Number(form.get("car_model_id")), car_year: Number(form.get("car_year"))
      }) });
      navigate("/dealer/" + id);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  if (loading) return <p role="status">Checking your session…</p>;
  if (!user) return <section className="form-page"><h1>Login to post a review</h1><p><Link to={"/login?next=/postreview/" + id}>Login</Link> to share your experience.</p></section>;
  if (!dealer) return <p role={error ? "alert" : "status"}>{error || "Loading review form…"}</p>;
  return <section className="form-page review-form">
    <Link className="back-link" to={"/dealer/" + id}>← Back to dealership</Link>
    <h1>Post a review</h1><p>{dealer.full_name} · Posting as {user.firstName || user.userName}{user.lastName ? " " + user.lastName : ""}</p>
    <form onSubmit={submit}>
      <label htmlFor="review">Your review</label><textarea id="review" name="review" rows="5" maxLength="2000" required />
      <label className="checkbox-label"><input type="checkbox" checked={purchase} onChange={e => setPurchase(e.target.checked)} />I purchased a vehicle from this dealer</label>
      {purchase && <>
        <label htmlFor="car-model">Car Make and Model</label>
        <select id="car-model" name="car_model_id" defaultValue="" required><option value="" disabled>Choose Car Make and Model</option>{models.map(model => <option key={model.id} value={model.id}>{model.CarMake} {model.CarModel}</option>)}</select>
        <div className="field-row"><div><label htmlFor="car-year">Car Year</label><input id="car-year" name="car_year" type="number" min="2015" max="2023" defaultValue="2023" required /></div>
          <div><label htmlFor="purchase-date">Purchase Date</label><input id="purchase-date" name="purchase_date" type="date" max={new Date().toLocaleDateString("en-CA")} required /></div></div>
      </>}
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="form-actions"><button disabled={busy || (purchase && models.length === 0)}>{busy ? "Posting…" : "Post Review"}</button><Link to={"/dealer/" + id}>Cancel</Link></div>
    </form>
  </section>;
}
