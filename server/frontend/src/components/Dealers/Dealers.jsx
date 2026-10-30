import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../Auth";

export default function Dealers() {
  const { user } = useAuth();
  const [dealers, setDealers] = useState([]);
  const [states, setStates] = useState([]);
  const [state, setState] = useState("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    api("/djangoapp/get_dealers" + (state === "All" ? "" : "/" + encodeURIComponent(state)),
      { signal: controller.signal }).then(data => {
        setDealers(data.dealers);
        if (state === "All") setStates([...new Set(data.dealers.map(item => item.state))].sort());
      }).catch(err => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [state]);
  const filtered = dealers.filter(item => (item.full_name + " " + item.city).toLowerCase().includes(query.toLowerCase()));
  const shown = filtered.slice((page - 1) * 10, page * 10);
  return <>
    <div className="page-heading"><div><h1>Find a dealership</h1><p>Compare locations and read what customers have to say.</p></div></div>
    <div className="filter-bar">
      <div><label htmlFor="dealer-search">Dealer or city</label><input id="dealer-search" type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Search dealerships" /></div>
      <div><label htmlFor="state">State</label><select id="state" value={state} onChange={e => { setState(e.target.value); setPage(1); }}><option value="All">All States</option>{states.map(value => <option key={value}>{value}</option>)}</select></div>
      {!loading && !error && <p className="result-count">{filtered.length} {filtered.length === 1 ? "dealership" : "dealerships"}{state !== "All" ? " in " + state : ""}</p>}
    </div>
    {loading ? <p role="status">Loading dealerships…</p> : error ? <p role="alert" className="alert">{error}</p> : filtered.length === 0 ? <p className="empty-state">No dealerships match this search. Try another city or state.</p> :
      <><div className="table-wrap"><table className="dealer-table">
        <thead><tr><th className="num">ID</th><th>Dealer Name</th><th>City</th><th>Address</th><th>Zip</th><th>State</th>{user && <th>Review Dealer</th>}</tr></thead>
        <tbody>{shown.map(dealer => <tr key={dealer.id}>
          <td className="num" data-label="ID">{dealer.id}</td>
          <td data-label="Dealer"><Link to={"/dealer/" + dealer.id}>{dealer.full_name}</Link></td>
          <td data-label="City">{dealer.city}</td><td data-label="Address">{dealer.address}</td>
          <td data-label="Zip">{dealer.zip}</td><td data-label="State">{dealer.state}</td>
          {user && <td data-label="Review"><Link to={"/postreview/" + dealer.id}>Review Dealer</Link></td>}
        </tr>)}</tbody>
      </table></div>
      {filtered.length > 10 && <div className="pagination"><span>{(page - 1) * 10 + 1}–{Math.min(page * 10, filtered.length)} of {filtered.length}</span><button className="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><button className="secondary" disabled={page * 10 >= filtered.length} onClick={() => setPage(page + 1)}>Next</button></div>}</>}
  </>;
}
