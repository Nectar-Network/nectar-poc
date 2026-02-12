package soroban

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sync/atomic"
	"time"
)

type Client struct {
	url  string
	http *http.Client
	seq  atomic.Int64
}

func NewClient(url string) *Client {
	return &Client{url: url, http: &http.Client{Timeout: 30 * time.Second}}
}

type SimulateResult struct {
	Results         []SimEntry `json:"results,omitempty"`
	Error           string     `json:"error,omitempty"`
	TransactionData string     `json:"transactionData,omitempty"`
	MinResourceFee  string     `json:"minResourceFee,omitempty"`
	LatestLedger    int64      `json:"latestLedger"`
}

type SimEntry struct {
	XDR  string   `json:"xdr"`
	Auth []string `json:"auth,omitempty"`
}

type TxResult struct {
	Status        string `json:"status"`
	Hash          string
	ResultXDR     string `json:"resultXdr,omitempty"`
	ErrorResultXDR string `json:"errorResultXdr,omitempty"`
}

type Event struct {
	Type        string   `json:"type"`
	ContractID  string   `json:"contractId"`
	Topic       []string `json:"topic"`
	Value       string   `json:"value"`
	Ledger      int64    `json:"ledger"`
}

func (c *Client) Simulate(txXDR string) (*SimulateResult, error) {
	var r SimulateResult
	return &r, c.call("simulateTransaction", map[string]string{"transaction": txXDR}, &r)
}

func (c *Client) Send(txXDR string) (string, error) {
	var r struct {
		Hash           string `json:"hash"`
		Status         string `json:"status"`
		ErrorResultXDR string `json:"errorResultXdr"`
	}
	if err := c.call("sendTransaction", map[string]string{"transaction": txXDR}, &r); err != nil {
		return "", err
	}
	if r.Status == "ERROR" {
		return "", fmt.Errorf("send tx: %s", r.ErrorResultXDR)
	}
	return r.Hash, nil
}

func (c *Client) AwaitTx(hash string, timeout time.Duration) (*TxResult, error) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		var r TxResult
		if err := c.call("getTransaction", map[string]string{"hash": hash}, &r); err != nil {
			return nil, err
		}
		r.Hash = hash
		switch r.Status {
		case "SUCCESS":
			return &r, nil
		case "FAILED":
			return nil, fmt.Errorf("tx %s failed: %s", hash[:8], r.ResultXDR)
		}
		select {
		case <-time.After(3 * time.Second):
		}
	}
	return nil, fmt.Errorf("tx %s timed out", hash[:8])
}

func (c *Client) GetEvents(startLedger int64, contractID string) ([]Event, error) {
	var r struct {
		Events []Event `json:"events"`
	}
	params := map[string]any{
		"startLedger": startLedger,
		"filters": []map[string]any{
			{"type": "contract", "contractIds": []string{contractID}},
		},
		"pagination": map[string]int{"limit": 200},
	}
	return r.Events, c.call("getEvents", params, &r)
}

func (c *Client) LatestLedger() (int64, error) {
	var r struct {
		Sequence int64 `json:"sequence"`
	}
	return r.Sequence, c.call("getLatestLedger", nil, &r)
}

func (c *Client) GetAccount(horizonURL, address string) (int64, error) {
	url := fmt.Sprintf("%s/accounts/%s", horizonURL, address)
	resp, err := c.http.Get(url)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	var r struct {
		Sequence string `json:"sequence"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return 0, err
	}
	var seq int64
	fmt.Sscanf(r.Sequence, "%d", &seq)
	return seq, nil
}

func (c *Client) call(method string, params any, out any) error {
	id := c.seq.Add(1)
	body, _ := json.Marshal(map[string]any{
		"jsonrpc": "2.0",
		"method":  method,
		"params":  params,
		"id":      id,
	})
	req, err := http.NewRequest(http.MethodPost, c.url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	var rr struct {
		Result json.RawMessage `json:"result"`
		Error  *struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&rr); err != nil {
		return err
	}
	if rr.Error != nil {
		return fmt.Errorf("rpc %s: %s", method, rr.Error.Message)
	}
	return json.Unmarshal(rr.Result, out)
}
