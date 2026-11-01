import { useId } from "react";

export function DataTable({
  columns = [],
  rows = [],
  getRowKey = (row, index) => row.id ?? index,
  caption,
  emptyMessage = "Todavía no hay datos para mostrar.",
  isLoading = false,
  className = "",
}) {
  const id = useId();

  return (
    <div className={"ui-table-scroll " + className}>
      <table className="ui-table" aria-busy={isLoading}>
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.align ? "ui-align-" + column.align : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr key={getRowKey(row, rowIndex)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    data-label={column.header}
                    className={column.align ? "ui-align-" + column.align : undefined}
                  >
                    {column.render
                      ? column.render(row[column.key], row, rowIndex)
                      : row[column.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="ui-table-empty" colSpan={Math.max(columns.length, 1)}>
                <span id={id}>{emptyMessage}</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
