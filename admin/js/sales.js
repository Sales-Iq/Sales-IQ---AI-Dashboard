import { requireAuth, initAppShell, fetchAll, $, money, dateText, emptyState, toCSV } from '../../js/shared.js';
const { profile } = await requireAuth(['Admin','Manager']);
initAppShell('admin','sales',profile);
let sales=[];
function sourceLabel(source){ return source === 'dummy' ? 'Dummy' : source === 'admin' ? 'Admin' : 'Staff'; }
function filtered(){
  const d=$('#dateFilter').value, sp=$('#salespersonFilter').value.toLowerCase(), pm=$('#paymentFilter').value;
  return sales.filter(s=>(!d || (s.createdAt?.toDate && s.createdAt.toDate().toISOString().slice(0,10)===d)) && (!sp || (s.salespersonName||'').toLowerCase().includes(sp) || (s.source||'').toLowerCase().includes(sp)) && (!pm || s.paymentMethod===pm));
}
function render(){
  const rows=filtered();
  $('#salesTable').innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Product</th><th>Qty</th><th>Total</th><th>Date & Time</th><th>Salesperson</th><th>Source</th><th>Payment</th></tr></thead><tbody>${rows.map(s=>`<tr><td class="font-black">${s.invoiceNumber||'-'}</td><td>${s.productName||'-'}</td><td>${s.quantity||0}</td><td>${money(s.totalAmount)}</td><td>${dateText(s.createdAt)}</td><td>${s.salespersonName||'-'}</td><td>${sourceLabel(s.source)}</td><td>${s.paymentMethod||'-'}</td></tr>`).join('')}</tbody></table></div>`:emptyState('No sales records','Start dummy live data or create sales from Billing.');
}
async function load(){sales=await fetchAll('sales'); render();}
['dateFilter','salespersonFilter','paymentFilter'].forEach(id=>$('#'+id).addEventListener('input',render));
$('#clearSalesFilters').onclick=()=>{$('#dateFilter').value='';$('#salespersonFilter').value='';$('#paymentFilter').value='';render();};
$('#exportSalesCsv').onclick=()=>toCSV(filtered().map(s=>({invoice:s.invoiceNumber,product:s.productName,quantity:s.quantity,total:s.totalAmount,date:dateText(s.createdAt),salesperson:s.salespersonName,source:sourceLabel(s.source),payment:s.paymentMethod})),'sales-report.csv');
load();
