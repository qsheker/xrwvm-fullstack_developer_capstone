import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../Auth";

export default function Dealer() {
  const { id } = useParams();
  const { user } = useAuth();
  const [dealer, setDealer] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setDealer(null); setError("");
    Promise.all([
      api("/djangoapp/dealer/" + id, { signal: controller.signal }),
      api("/djangoapp/reviews/dealer/" + id, { signal: controller.signal })
    ]).then(([detail, feedback]) => {
      setDealer(detail.dealer[0]); setReviews(feedback.reviews);
    }).catch(err => { if (err.name !== "AbortError") setError(err.message); });
    return () => controller.abort();
  }, [id]);
  if (error) return <p className="alert" role="alert">{error}</p>;
  if (!dealer) return <p role="status">Loading dealer and reviews…</p>;
  return <>
    <Link className="back-link" to="/dealers">← All dealerships</Link>
    <div className="page-heading"><div><h1>{dealer.full_name}</h1><p>{dealer.address}, {dealer.city}, {dealer.state} {dealer.zip}</p></div>
      <Link className="button" to={user ? "/postreview/" + id : "/login?next=/postreview/" + id}>{user ? "Post Review" : "Login to review"}</Link>
    </div>
    <div className="section-heading"><h2>Customer reviews</h2><span>{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span></div>
    {reviews.length === 0 ? <p className="empty-state">No reviews yet. Share the first experience with this dealership.</p> :
      <div className="reviews-grid">{reviews.map(review => <article className="card review-card" key={review.id}>
        <div className="review-heading"><h3>{review.name}</h3><span className={"sentiment " + review.sentiment}>{review.sentiment === "unavailable" ? "Sentiment unavailable" : review.sentiment}</span></div>
        <p className="review-text">{review.review}</p>
        <p className="review-meta">{review.purchase ? [review.car_make, review.car_model, review.car_year].join(" ") : "Dealership visit"}</p>
        {review.purchase && <p className="review-meta">Purchased: {review.purchase_date}</p>}
      </article>)}</div>}
  </>;
}
