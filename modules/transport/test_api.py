"""
Script de test rapide pour vérifier que l'API fonctionne
Usage: python test_api.py
"""
import httpx
import sys
from rich.console import Console
from rich.table import Table

console = Console()

API_BASE_URL = "http://localhost:8000"

def test_endpoint(endpoint: str, name: str):
    """Teste un endpoint et affiche le résultat"""
    try:
        response = httpx.get(f"{API_BASE_URL}{endpoint}", timeout=5)
        if response.status_code == 200:
            console.print(f"✅ {name}", style="bold green")
            return True
        else:
            console.print(f"❌ {name} - Status {response.status_code}", style="bold red")
            return False
    except httpx.ConnectError:
        console.print(f"❌ {name} - Impossible de se connecter", style="bold red")
        return False
    except Exception as e:
        console.print(f"❌ {name} - Erreur: {e}", style="bold red")
        return False

def main():
    console.print("\n[bold blue]🧪 Test de l'API Transport[/bold blue]\n")

    results = []

    # Test des endpoints
    console.print("[bold]Tests des endpoints:[/bold]")
    results.append(test_endpoint("/", "Root endpoint"))
    results.append(test_endpoint("/health", "Health check"))
    results.append(test_endpoint("/health/ready", "Readiness check"))
    results.append(test_endpoint("/health/live", "Liveness check"))
    results.append(test_endpoint("/summary", "Summary endpoint"))
    results.append(test_endpoint("/summary/tournees", "Tournées endpoint"))

    # Résumé
    console.print(f"\n[bold]Résumé:[/bold]")
    passed = sum(results)
    total = len(results)

    table = Table(show_header=True)
    table.add_column("Métrique", style="cyan")
    table.add_column("Valeur", style="green")

    table.add_row("Tests réussis", f"{passed}/{total}")
    table.add_row("Taux de succès", f"{(passed/total)*100:.1f}%")

    console.print(table)

    if passed == total:
        console.print("\n✨ [bold green]Tous les tests sont passés ![/bold green]")
        console.print("L'API est prête à être utilisée.\n")
        console.print("Documentation interactive : http://localhost:8000/docs")
        return 0
    else:
        console.print("\n⚠️  [bold yellow]Certains tests ont échoué[/bold yellow]")
        console.print("Vérifiez que l'API FastAPI est démarrée sur le port 8000")
        console.print("\nPour démarrer l'API :")
        console.print("  cd modules/transport")
        console.print("  uvicorn api.main:app --reload\n")
        return 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        console.print("\n\n[yellow]Test interrompu par l'utilisateur[/yellow]")
        sys.exit(1)
