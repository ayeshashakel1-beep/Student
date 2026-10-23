export type SessionRow = { studentId: string; studentName: string; courseCode: string; courseName: string; termName: string; termSequence: string; moduleName: string; moduleSequence: string; sessionName: string; sessionSequence: number; attendanceDate: string; centerName: string };
export async function readApiJson(response: Response): Promise<any> {
  const text = await response.text();
  let result: any;
  try { result = JSON.parse(text); }
  catch { throw new Error(`Server returned non-JSON (HTTP ${response.status}). Check backend/proxy. ${text.trim().startsWith('<') ? 'An HTML error page was returned, often due to request size or an incorrect API route.' : text.slice(0, 120)}`); }
  if (!response.ok) throw new Error(result?.error || `Server error HTTP ${response.status}`);
  return result;
}
export async function uploadSessionRows(filename: string, rows: SessionRow[], progress?: (done: number, total: number) => void) {
  if (!rows.length) throw new Error('CSV contains no valid student/session rows.');
  const importId = `csv-${crypto.randomUUID()}`;
  const chunkSize = 500; // small enough for strict gateways and large source CSVs
  let done = 0;
  try {
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const response = await fetch('/api/session-log/chunk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ importId, filename, rows: chunk, first: i === 0, last: i + chunkSize >= rows.length }) });
      await readApiJson(response);
      done += chunk.length;
      progress?.(done, rows.length);
    }
    return { importId, importedRows: done, distinctStudents: new Set(rows.map(r => r.studentId)).size };
  } catch (e) {
    if (done > 0) await fetch(`/api/session-log/imports/${encodeURIComponent(importId)}`, { method: 'DELETE' }).catch(() => undefined);
    throw e;
  }
}
