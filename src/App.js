import React, { Component } from 'react';
import './App.css';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update, set, query, orderByKey, limitToLast, get } from 'firebase/database';
import { remove } from "firebase/database";

// Import additional necessary libraries
import emailjs from 'emailjs-com';

const firebaseConfig = {
  apiKey: "AIzaSyDPVqQTVH2l78MzNjzAdGzOvEm2TBfcSUI",
  authDomain: "lediot-6777b.firebaseapp.com",
  databaseURL: "https://lediot-6777b-default-rtdb.firebaseio.com",
  projectId: "lediot-6777b",
  storageBucket: "lediot-6777b.appspot.com",
  messagingSenderId: "773333254863",
  appId: "1:773333254863:web:1453c5fa97f8f2ccb7adba",
  measurementId: "G-Z202KF5QMV"
};

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      addresses: [],
      selectedAddress: null,
      leds: [],
      isOpen: false,
      nextLedId: 1,
      newAddress: '',
      showModal: false,
      inputKey: '',
      generatedKey: '',
      isAuthenticated: false,
      optionCount: 0,
      options: [],
      showUpdateOptionModal: false, // trạng thái mới để hiển thị modal cập nhật hoặc xóa option
      selectedOptionKey: null, // trạng thái mới để lưu trữ option được chọn
      updateOptionStartTime: '',
      updateOptionEndTime: '',
      updateOptionLevel: '',
      checkboxChecked: false,
      optionTimelineEnabled: false,
    };
  }

  componentDidMount() {
    const addressRef = ref(database, 'LightStreet');
    onValue(addressRef, (snapshot) => {
      const addressesData = snapshot.val();
      if (addressesData) {
        const locationRef = ref(database, 'Location');
        get(locationRef).then((locationSnapshot) => {
          if (locationSnapshot.exists()) {
            const locations = locationSnapshot.val();
            const addresses = Object.keys(addressesData).map(key => ({
              key,
              name: locations[key] || key, // Sử dụng tên khu vực hoặc mã khu vực nếu không có tên
              leds: addressesData[key]
            }));
            this.setState({ addresses });
  
            const { selectedAddress } = this.state;
            if (selectedAddress) {
              const leds = addresses.find(address => address.key === selectedAddress)?.leds || [];
              this.setState({ leds });
  
              Object.keys(leds).forEach(ledKey => {
                const led = leds[ledKey];
                if (led.error === '1' && led.Control) {
                  const ledRef = ref(database, `LightStreet/${selectedAddress}/${ledKey}`);
                  update(ledRef, { Control: 0 });
                  this.setState(prevState => ({
                    leds: {
                      ...prevState.leds,
                      [ledKey]: { ...prevState.leds[ledKey], Control: false }
                    }
                  }));
                }
              });
            }
          }
        }).catch((error) => {
          console.error("Error fetching location names: ", error);
        });
      }
    });
  }
  
//Address
  handleAddressClick = (addressKey) => {
    const { selectedAddress } = this.state;

    if (selectedAddress === addressKey) {
      this.setState({
        selectedAddress: null,
        leds: [],
        isOpen: false
      });
    } else {
      this.setState({
        selectedAddress: addressKey,
        leds: this.state.addresses.find(address => address.key === addressKey)?.leds || [],
        isOpen: true
      });
    }
  }

  handleLevelChange = (ledKey, level) => {
    const { selectedAddress } = this.state;
    const led = this.state.leds[ledKey];

    if (led.Control) {
      const ledRef = ref(database, `LightStreet/${selectedAddress}/${ledKey}`);
      update(ledRef, { value: level });
      this.setState(prevState => ({
        leds: {
          ...prevState.leds,
          [ledKey]: { ...prevState.leds[ledKey], value: level }
        }
      }));
    }
  };

  handleToggleLed = (ledKey) => {
    const { selectedAddress } = this.state;
    const led = this.state.leds[ledKey];
    const ledRef = ref(database, `LightStreet/${selectedAddress}/${ledKey}`);
  
    if (led.error === '1') {
      // Nếu đèn có lỗi
      update(ledRef, { Control: 0, Mode: 0 });
      this.setState(prevState => ({
        leds: {
          ...prevState.leds,
          [ledKey]: { ...prevState.leds[ledKey], Control: false, Mode: 0 } // Mode ở trạng thái 0 khi lỗi
        }
      }));
    } else {
      // Nếu đèn không có lỗi
      const currentControl = led.Control;
      const controlValue = currentControl ? 0 : 1;
      update(ledRef, { Control: controlValue, Mode: 0 });
      this.setState(prevState => ({
        leds: {
          ...prevState.leds,
          [ledKey]: { ...prevState.leds[ledKey], Control: !currentControl, Mode: 0 } // Mode ở trạng thái 1 khi hoạt động bình thường
        }
      }));
  
      const button = document.getElementById(`button-${ledKey}`);
      button.classList.add('clicked');
      setTimeout(() => {
        button.classList.remove('clicked');
      }, 300);
    }
  };
  
  

  handleAddLed = () => {
    const { selectedAddress, isAuthenticated } = this.state;
    if (!selectedAddress || !isAuthenticated) return;
  
    const addressRef = ref(database, `LightStreet/${selectedAddress}`);
    const queryRef = query(addressRef, orderByKey(), limitToLast(1));
  
    get(queryRef).then((snapshot) => {
      let newLedId;
      if (snapshot.exists()) {
        const latestLedKey = Object.keys(snapshot.val())[0];
        newLedId = parseInt(latestLedKey.replace('Light', '')) + 1;
      } else {
        newLedId = 1;
      }
  
      const newLedKey = `Light${newLedId}`;
      const newLedRef = ref(database, `LightStreet/${selectedAddress}/${newLedKey}`);
      set(newLedRef, {
        value: '1',
        sensorLig: 'N/A',
        sensorEnv: 'N/A',
        lightname: newLedKey,
        Control: false,
        error: 'N/A',
        Mode: false,
        LightChart: {}
      }).then(() => {
        this.setState(prevState => ({
          leds: {
            ...prevState.leds,
            [newLedKey]: {
              value: '1',
              sensorLig: 'N/A',
              sensorEnv: 'N/A',
              lightname: newLedKey,
              Control: false,
              Mode: false,
              error: 'N/A',
              LightChart: {},
            }
          }
        }));
      }).catch((error) => {
        console.error("Error adding new LED: ", error);
      });
  
    }).catch((error) => {
      console.error("Error fetching LED data: ", error);
    });
  };
  
  //Address
  // LightChart
  handleAddLightChartOption = () => {
    const { selectedAddress, selectedLedKey, newOptionStartTime, newOptionEndTime, newOptionLevel, optionCount } = this.state;
    const ledRef = ref(database, `LightStreet/${selectedAddress}/${selectedLedKey}`);
  
    const newOptionKey = `Option${optionCount + 1}`;
  
    update(ledRef, {
      LightChart: {
        ...this.state.leds[selectedLedKey].LightChart,
        [newOptionKey]: {
          StartTime: newOptionStartTime,
          EndTime: newOptionEndTime,
          Level: parseInt(newOptionLevel)
        }
      }
    }).then(() => {
      this.setState(prevState => ({
        leds: {
          ...prevState.leds,
          [selectedLedKey]: {
            ...prevState.leds[selectedLedKey],
            LightChart: {
              ...prevState.leds[selectedLedKey].LightChart,
              [newOptionKey]: {
                StartTime: newOptionStartTime,
                EndTime: newOptionEndTime,
                Level: parseInt(newOptionLevel)
              }
            }
          }
        },
        newOptionStartTime: '',
        newOptionEndTime: '',
        newOptionLevel: '',
        optionCount: prevState.optionCount + 1, // Tăng optionCount lên 1
        options: [...prevState.options, newOptionKey], // Cập nhật mảng options
        showNewOptionModal: false
      }));
      this.handleCloseAddOptionModal();
    }).catch((error) => {
      console.error("error adding LightChart option: ", error);
    });
  };
  handleUpdateOption = () => {
    const { selectedAddress, selectedLedKey, selectedOptionKey, updateOptionStartTime, updateOptionEndTime, updateOptionLevel } = this.state;
    const optionRef = ref(database, `LightStreet/${selectedAddress}/${selectedLedKey}/LightChart/${selectedOptionKey}`);
  
    update(optionRef, {
      StartTime: updateOptionStartTime,
      EndTime: updateOptionEndTime,
      Level: parseInt(updateOptionLevel)
    }).then(() => {
      this.setState(prevState => ({
        leds: {
          ...prevState.leds,
          [selectedLedKey]: {
            ...prevState.leds[selectedLedKey],
            LightChart: {
              ...prevState.leds[selectedLedKey].LightChart,
              [selectedOptionKey]: {
                StartTime: updateOptionStartTime,
                EndTime: updateOptionEndTime,
                Level: parseInt(updateOptionLevel)
              }
            }
          }
        }
      }));
      this.handleCloseUpdateOptionModal();
    }).catch((error) => {
      console.error("error updating option: ", error);
    });
  };
  
  handleDeleteOption = () => {
    const { selectedAddress, selectedLedKey, selectedOptionKey } = this.state;
    const optionRef = ref(database, `LightStreet/${selectedAddress}/${selectedLedKey}/LightChart/${selectedOptionKey}`);
  
    remove(optionRef).then(() => {
      this.setState(prevState => {
        const updatedLightChart = { ...prevState.leds[selectedLedKey].LightChart };
        delete updatedLightChart[selectedOptionKey];
  
        return {
          leds: {
            ...prevState.leds,
            [selectedLedKey]: {
              ...prevState.leds[selectedLedKey],
              LightChart: updatedLightChart
            }
          },
          showUpdateOptionModal: false,
          selectedOptionKey: null,
          updateOptionStartTime: '',
          updateOptionEndTime: '',
          updateOptionLevel: '',
        };
      });
    }).catch((error) => {
      console.error("error deleting option: ", error);
    });
  };
  //LightChart

  handleNewAddressChange = (e) => {
    this.setState({ newAddress: e.target.value });
  };

  handleAddAddress = () => {
    const { newAddress, isAuthenticated } = this.state;
    if (!newAddress.trim() || !isAuthenticated) return;

    const newAddressRef = ref(database, `${newAddress}`);
    set(newAddressRef, {})
      .then(() => {
        this.setState(prevState => ({
          addresses: [...prevState.addresses, { key: newAddress, leds: {} }],
          newAddress: '',
          nextLedId: 1
        }));
      })
      .catch((error) => {
        console.error("error adding new address: ", error);
      });
  };

  generateKey = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let generatedKey = '';
    for (let i = 0; i < 10; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      generatedKey += characters.charAt(randomIndex);
    }
    this.setState({ generatedKey });
    // Replace with your email sending logic
    emailjs.send('service_v2x4k79', 'template_ay8d2es', {
      key: generatedKey,
      to_email: 'trannhattanfpt@gmail.com'
    }, 'wrrs9YUHweAV-JPKa')
    .then((response) => {
      console.log('Email sent successfully!', response.status, response.text);
    }, (error) => {
      console.error('Failed to send email.', error);
    });
  };

  handleKeyChange = (e) => {
    this.setState({ inputKey: e.target.value });
  };

  handleSubmitKey = () => {
    const { inputKey, generatedKey } = this.state;
    if (inputKey === generatedKey) {
      this.setState({ isAuthenticated: true, showModal: false });
    } else {
      alert('Invalid key. Please try again.');
    }
  };

  handleShowModal = () => {
    this.generateKey();
    this.setState({ showModal: true });
  };

  handleCloseModal = () => {
    this.setState({ showModal: false });
  };
  handleLogout = () => {
    // Add logout logic here
    this.setState({ isAuthenticated: false });
  };
  handleShowModal1 = () => {
    this.setState({ showModal1: true });
  };
  handleCloseModal1 = () => {
    this.setState({ showModal1: false });
  };
  handleShowAddOptionModal = (ledKey) => {
    this.setState({ showAddOptionModal: true, selectedLedKey: ledKey });
  };  

  handleCloseAddOptionModal = () => {
    this.setState({ showAddOptionModal: false });
  };

  handleShowNewOptionModal = () => {
    this.setState({ showNewOptionModal: true });
  };

  handleCloseNewOptionModal = () => {
    this.setState({ showNewOptionModal: false });
  };

  handleOptionStartTimeChange = (e) => {
    this.setState({ newOptionStartTime: e.target.value });
  };

  handleOptionEndTimeChange = (e) => {
    this.setState({ newOptionEndTime: e.target.value });
  };

  handleOptionLevelChange = (e) => {
    this.setState({ newOptionLevel: e.target.value });
  };
  handleShowUpdateOptionModal = (optionKey, optionData) => {
    this.setState({
      showUpdateOptionModal: true,
      selectedOptionKey: optionKey,
      updateOptionStartTime: optionData.StartTime,
      updateOptionEndTime: optionData.EndTime,
      updateOptionLevel: optionData.Level,
    });
  };
  
  handleCloseUpdateOptionModal = () => {
    this.setState({
      showUpdateOptionModal: false,
      selectedOptionKey: null,
      updateOptionStartTime: '',
      updateOptionEndTime: '',
      updateOptionLevel: '',
    });
  };
  handleCheckboxChange = (ledKey) => {
    const { selectedAddress, leds } = this.state;
    const ledRef = ref(database, `LightStreet/${selectedAddress}/${ledKey}`);
  
    // Đảo ngược trạng thái Mode khi click vào checkbox
    const newMode = leds[ledKey].Mode === 1 ? 0 : 1;
  
    update(ledRef, { Mode: newMode }) // Cập nhật Mode lên Firebase
  
    this.setState(prevState => ({
      leds: {
        ...prevState.leds,
        [ledKey]: {
          ...prevState.leds[ledKey],
          Mode: newMode,
          checkboxChecked: newMode === 0 // Cập nhật checkboxChecked
        }
      }
    }));
  };
  

  render() {
    const { addresses, selectedAddress, leds, newAddress, isOpen, showModal, inputKey, isAuthenticated, showAddOptionModal, showNewOptionModal, selectedLedKey, newOptionStartTime, newOptionEndTime, newOptionLevel, showUpdateOptionModal, updateOptionStartTime, updateOptionEndTime, updateOptionLevel } = this.state;
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="header-content">
            <h1>LED Control Panel</h1>
            <p>Manage Smart Light</p>
            {isAuthenticated ? (
              <div className="auth-section">
                <button onClick={this.handleLogout}>LOGOUT</button>
              </div>
            ) : (
              <div className="auth-section">
                <button onClick={this.handleShowModal}>LOGIN WITH MANAGER</button>
              </div>
            )}
          </div>
        </header>
        <div className="wrapper">
      <div className="address-list">
        {addresses.map(address => (
          <div
            key={address.key}
            className={`address-item ${selectedAddress === address.key ? 'active' : ''}`}
            onClick={() => this.handleAddressClick(address.key)}
          >
            <span className={`dropdown-arrow ${isOpen && selectedAddress === address.key ? 'active' : ''}`}></span>
            {address.name} {/* Hiển thị tên khu vực */}
          </div>
            ))}
            {isAuthenticated && (
              <div className="add-address">
                <input
                  type="text"
                  value={newAddress}
                  onChange={this.handleNewAddressChange}
                  placeholder="Enter new address"
                />
                <button onClick={this.handleAddAddress}>ADD ADDRESS</button>
              </div>
            )}
          </div>
          {selectedAddress && (
            <div className={`led-container ${selectedAddress ? 'active' : ''}`}>
              {Object.keys(leds).map((ledKey) => (
                <div key={ledKey} className={`card ${leds[ledKey].error === '1' ? 'red' : leds[ledKey].error === '2' ? 'light-blue' : ''}`}>
                  <h2>{ledKey}</h2>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    value={leds[ledKey].value}
                    onChange={(e) => this.handleLevelChange(ledKey, e.target.value)}
                    disabled={!leds[ledKey].Control}
                  />
                  <button
                    id={`button-${ledKey}`}
                    onClick={() => this.handleToggleLed(ledKey)}
                    className={leds[ledKey].Control ? 'disable' : 'enable'}
                  >
                    <span className="effect"></span>
                    {leds[ledKey].Control ? 'Auto' : 'Custom'}
                  </button>
                  <p>Ambient Light: {leds[ledKey].sensorLig}</p>
                  <p>Brightness: {leds[ledKey].sensorEnv}</p>
                  
                  <button
                  onClick={() => this.handleShowAddOptionModal(ledKey)}
                  disabled={leds[ledKey].Mode !== 1 || leds[ledKey].Control} // Khóa nếu checkbox không được chọn
                  className={leds[ledKey].Control ? 'locked' : ''||leds[ledKey].Mode !== 1  ? 'locked' : ''}
                >
                  OPTION TIMELINE
                </button>
                {!leds[ledKey].Control && (
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={leds[ledKey].Mode === 1}
                      onChange={() => this.handleCheckboxChange(ledKey)}
                    />
                    <span className={`slider round ${leds[ledKey].Mode === 1 ? 'checked' : ''}`}></span>
                  </label>
                )}
                </div>
              ))}
              {isAuthenticated && (
                <button className="button1" onClick={this.handleAddLed}>ADD LED</button>
              )}
            </div>
          )}
        </div>
        {showModal && (
          <div className="modal">
            <div className="modal-content">
              <h2>Enter Key</h2>
              <input
                type="text"
                value={inputKey}
                onChange={this.handleKeyChange}
                placeholder="Enter the key sent to your email"
              />
              <button onClick={this.handleSubmitKey} className="modal-button">Submit Key</button>
              <button onClick={this.handleCloseModal} className="modal-button">Close</button>
            </div>
          </div>
        )}
        {showAddOptionModal && (
          <div className="modal">
            <div className="modal-content">
              <h2>LightChart Options</h2>
              {Object.keys(leds[selectedLedKey]?.LightChart || {}).map(optionKey => (
                <div key={optionKey}>
                  <button className="option-button" onClick={() => this.handleShowUpdateOptionModal(optionKey, leds[selectedLedKey].LightChart[optionKey])}>
                    Option {optionKey}: {leds[selectedLedKey].LightChart[optionKey].StartTime} - {leds[selectedLedKey].LightChart[optionKey].EndTime} (Level {leds[selectedLedKey].LightChart[optionKey].Level})
                  </button>
                </div>
              ))}
              <button onClick={this.handleShowNewOptionModal}>NEW OPTION</button>
              <button onClick={this.handleCloseAddOptionModal} className="modal-button">Close</button>
            </div>
          </div>
        )}
        {showUpdateOptionModal && (
          <div className="modal">
            <div className="modal-content">
              <h2>Update/Delete Option</h2>
              <label>Start Time:
                <input
                  type="text"
                  value={updateOptionStartTime}
                  onChange={(e) => this.setState({ updateOptionStartTime: e.target.value })}
                />
              </label>
              <label>End Time:
                <input
                  type="text"
                  value={updateOptionEndTime}
                  onChange={(e) => this.setState({ updateOptionEndTime: e.target.value })}
                />
              </label>
              <label>Level:
              <input
                  type="range"
                  min="0"
                  max="8"
                  value={updateOptionLevel}
                  onChange={(e) => this.setState({ updateOptionLevel: e.target.value })}
                />
              </label>
              <button onClick={this.handleUpdateOption}>Update</button>
              <button onClick={this.handleDeleteOption}>Delete</button>
              <button onClick={this.handleCloseUpdateOptionModal} className="modal-button">Close</button>
            </div>
          </div>
        )}
        {showNewOptionModal && (
          <div className="modal">
            <div className="modal-content">
              <h2>Add New Option</h2>
              <label>Start Time:
                <input
                  type="text"
                  value={newOptionStartTime}
                  onChange={this.handleOptionStartTimeChange}
                />
              </label>
              <label>End Time:
                <input
                  type="text"
                  value={newOptionEndTime}
                  onChange={this.handleOptionEndTimeChange}
                />
              </label>
              <label>Level:
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={newOptionLevel}
                  onChange={(e) => this.setState({ newOptionLevel: e.target.value })}
                />
              </label>
              <button onClick={this.handleAddLightChartOption}>Submit</button>
              <button onClick={this.handleCloseNewOptionModal} className="modal-button">Close</button>
            </div>
          </div>
        )}
        
      </div>
    );
  }
}

export default App;