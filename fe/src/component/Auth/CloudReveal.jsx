import "./CloudReveal.css";

function CloudReveal() {
  return (
    <div className="auth-cloud-reveal" aria-hidden="true">
      <span className="auth-cloud-reveal__veil" />
      <span className="auth-cloud-reveal__bank auth-cloud-reveal__bank--left" />
      <span className="auth-cloud-reveal__bank auth-cloud-reveal__bank--right" />
    </div>
  );
}

export default CloudReveal;
