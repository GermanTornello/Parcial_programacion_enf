import { useId } from "react";

export function SearchBar({
  value = "",
  onChange,
  onSearch,
  placeholder = "Buscar",
  ariaLabel = "Buscar",
  isLoading = false,
  className = "",
}) {
  const inputId = useId();

  function submit(event) {
    event.preventDefault();
    onSearch?.(value.trim());
  }

  return (
    <form className={"ui-search " + className} role="search" onSubmit={submit}>
      <label className="ui-sr-only" htmlFor={inputId}>
        {ariaLabel}
      </label>
      <input
        id={inputId}
        className="ui-control ui-search-input"
        type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {value ? (
        <button
          className="ui-search-clear"
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => onChange?.("")}
        >
          Limpiar
        </button>
      ) : null}
      <button className="ui-button ui-button-primary" type="submit" disabled={isLoading}>
        {isLoading ? "Buscando…" : "Buscar"}
      </button>
    </form>
  );
}

export default SearchBar;

