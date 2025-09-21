const API_BASE_URL = 'https://www.centrosultransportes.com.br/api_boleto';
const API_PONTO_URL = 'https://www.centrosultransportes.com.br/api_ponto';

export class ApiService {
  private static getHeaders(includeAuth = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  static async login(email: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ email, password }),
      });

      return await response.json();
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
  }

  static async verifyToken(token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ token }),
      });

      return await response.json();
    } catch (error) {
      console.error('Token verification error:', error);
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
  }

  static async getTimeEntries(startDate: string, endDate: string) {
    try {
      const response = await fetch(
        `${API_PONTO_URL}/timecard/entries/?start_date=${startDate}&end_date=${endDate}`,
        { headers: this.getHeaders(true) }
      );
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching time entries:', error);
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
  }

  static async punchTime() {
    // Executar chamadas em paralelo para otimizar performance
    const [locationData, ipData] = await Promise.all([
      this.getUserLocation(),
      this.getUserIP()
    ]);
    
    // Criar timestamp no horário local brasileiro
    const now = new Date();
    
    // Formatar data e hora no padrão brasileiro sem conversão UTC
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    
    // Formato: YYYY-MM-DD HH:MM:SS.mmm (horário local brasileiro)
    const localTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    
    const requestBody = {
      ip_address: ipData.ip,
      location: locationData,
      user_agent: navigator.userAgent,
      timestamp: localTimestamp
    };
    
    try {
      const response = await fetch(`${API_PONTO_URL}/timecard/punch/`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(requestBody),
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error punching time:', error);
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
  }

  private static async getUserLocation(): Promise<{
    latitude?: number;
    longitude?: number;
    address?: string;
  }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({});
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Não buscar endereço para otimizar performance
          // O backend pode fazer isso se necessário
          resolve({ latitude, longitude });
        },
        () => {
          resolve({});
        },
        {
          enableHighAccuracy: false, // Mais rápido
          timeout: 5000, // Timeout menor
          maximumAge: 60000 // Cache por 1 minuto
        }
      );
    });
  }

  private static async getUserIP(): Promise<{ ip: string }> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return { ip: data.ip };
    } catch {
      return { ip: 'unknown' };
    }
  }

  private static async getAddressFromCoords(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`
      );
      const data = await response.json();
      return data.display_name || `${lat}, ${lng}`;
    } catch {
      return `${lat}, ${lng}`;
    }
  }
}